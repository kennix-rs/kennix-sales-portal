/**
 * LocalSalesService keeps the Sales preview's data in localStorage and enforces the Sales rules.
 * Screens only talk to this class, so an API-backed version can replace it later (as
 * ApiCrmService did for Telesales).
 */
import { createInitialState, PASSWORD, previewUsers } from '../data/fixtures'
import { captureStamp } from '../lib/geo'
import { ALERT_STAGES, allowanceFor, isInProcessOutcome, isReadOnly, meetingFormMissing, recentInProcessAttempts, RETURN_RULE, siteVisitMissing, visibleOwnerIds, visitHappened } from '../lib/rules'
import { makeId, now } from '../lib/utils'
import type {
  CallOutcome, CustomerDetails, MeetingProfile, SalesLead, SalesStage, SalesState, SiteVisitReport, Task,
  TaskType, User, Visit, VisitKind,
} from '../types'

/** v2: voice-note changes (Sales Rejected, Plan Postponed, alerts, who fixed each visit). */
export const STORAGE_KEY = 'kennix.sales.state.v2'

export class SalesError extends Error {
  missing?: string[]
  constructor(message: string, missing?: string[]) {
    super(message)
    this.missing = missing
  }
}

const MEETINGS: VisitKind[] = ['Sales Meeting', 'Follow-up Meeting']

export interface CallInput {
  outcome: CallOutcome
  notes: string
  /** Required for the In Process outcomes: RNR, Plan Postponed, Call Back Later and Switch Off. */
  nextCallAt?: string
  /** Required for Rescheduled: the meeting's new date and time. */
  newVisitAt?: string
}

export interface ClosingInput {
  tokenAmount: number
  paymentReference: string
  handoverCallAt: string
}

export class LocalSalesService {
  private read(): SalesState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as SalesState
    } catch {
      // Unreadable saved data: start again from the demo data.
    }
    const state = createInitialState()
    this.write(state)
    return state
  }

  private write(state: SalesState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  /** Loads, applies one change and saves, so every action is all-or-nothing. */
  private change<T>(work: (state: SalesState) => T): T {
    const state = this.read()
    const result = work(state)
    this.write(state)
    return result
  }

  private lead(state: SalesState, journeyId: string, actor: User, { editable = true } = {}) {
    const lead = state.leads.find(item => item.journeyId === journeyId)
    if (!lead || !visibleOwnerIds(actor, previewUsers).has(lead.ownerId)) throw new SalesError('Journey not found')
    if (editable && lead.stage === 'Closed') throw new SalesError('This journey is closed and handed over; it is read-only in Sales')
    if (editable && lead.stage === 'Dead') throw new SalesError('This journey is marked dead and is read-only')
    if (editable && lead.stage === 'Sales Rejected') throw new SalesError('This journey was sent back to Telesales and is read-only in Sales')
    return lead
  }

  private log(lead: SalesLead, actor: User, type: string, description: string) {
    lead.activities.unshift({ id: makeId('ACT'), type, description, actor: actor.name, createdAt: now().toISOString() })
  }

  private addTask(state: SalesState, lead: SalesLead, type: TaskType, title: string, dueAt: string) {
    const task: Task = { id: makeId('TSK'), journeyId: lead.journeyId, type, title, dueAt, status: 'Open', ownerId: lead.ownerId }
    state.tasks.push(task)
    return task
  }

  private closeTasks(state: SalesState, journeyId: string, types?: TaskType[]) {
    state.tasks.forEach(task => {
      if (task.journeyId === journeyId && task.status === 'Open' && (!types || types.includes(task.type))) task.status = 'Done'
    })
  }

  private setStage(lead: SalesLead, stage: SalesStage) {
    lead.stage = stage
    if (stage !== 'In Process') {
      delete lead.inProcessReason
      delete lead.resumeStage
    }
  }

  /** Moves the journey on and, for the key stages, alerts the owner's Team Lead and Manager. */
  private advanceTo(state: SalesState, lead: SalesLead, stage: SalesStage, actor: User) {
    this.setStage(lead, stage)
    if (ALERT_STAGES.includes(stage)) {
      state.alerts.push({ id: makeId('ALR'), journeyId: lead.journeyId, customer: lead.customer.name, stage, actor: actor.name, ownerId: lead.ownerId, at: now().toISOString(), readBy: [] })
    }
  }

  /** "Sales rejected": the journey goes back to Telesales with Sales' comment and is read-only here. */
  private returnToTelesalesIn(state: SalesState, lead: SalesLead, reason: string, attempts: number, actor: User) {
    lead.returnedToTelesales = { at: now().toISOString(), reason, attempts, by: actor.name }
    this.setStage(lead, 'Sales Rejected')
    lead.visits.forEach(visit => { if (visit.status === 'Scheduled') visit.status = 'Cancelled' })
    this.closeTasks(state, lead.journeyId)
    this.log(lead, actor, 'Sent back to Telesales', attempts ? `${attempts} attempts without reaching the customer: ${reason}` : reason)
  }

  private future(value: string | undefined, what: string) {
    if (!value || Number.isNaN(new Date(value).getTime())) throw new SalesError(`Choose the ${what}`)
    if (new Date(value) <= now()) throw new SalesError(`The ${what} must be in the future`)
  }

  // --- Session ------------------------------------------------------------------------------

  async getState(): Promise<SalesState> { return structuredClone(this.read()) }
  async listUsers(): Promise<User[]> { return structuredClone(previewUsers) }

  async login(email: string, password: string): Promise<User | null> {
    const user = previewUsers.find(item => item.email === email.trim().toLowerCase())
    return user && password === PASSWORD ? structuredClone(user) : null
  }

  async logout() {}

  reset() { localStorage.removeItem(STORAGE_KEY) }

  // --- Calls and the feedback thread --------------------------------------------------------

  /** Every Sales call needs a comment; it's added to the journey's feedback thread. */
  async logCall(journeyId: string, input: CallInput, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      const notes = input.notes.trim()
      if (notes.length < 5) throw new SalesError('Add a short comment about the call')
      const at = now().toISOString()
      const scheduled = lead.visits.filter(visit => visit.status === 'Scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]

      if (isInProcessOutcome(input.outcome) && recentInProcessAttempts(lead) + 1 < RETURN_RULE.attempts) {
        this.future(input.nextCallAt, 'next call date and time')
      }
      if (input.outcome === 'Meeting Confirmed' && !scheduled) throw new SalesError('There is no scheduled meeting or site visit to confirm')
      if (input.outcome === 'Rescheduled') {
        if (!scheduled) throw new SalesError('There is no scheduled meeting or site visit to reschedule')
        this.future(input.newVisitAt, 'new date and time')
      }

      lead.calls.unshift({ id: makeId('CALL'), at, outcome: input.outcome, notes, employee: actor.name })
      lead.feedback.push({ id: makeId('FB'), text: notes, author: actor.name, team: 'Sales', createdAt: at, outcome: input.outcome })
      this.closeTasks(state, lead.journeyId, ['Reconfirm Meeting', 'Follow-up Call', 'Call'])

      if (isInProcessOutcome(input.outcome)) {
        const attempts = recentInProcessAttempts(lead)
        if (attempts >= RETURN_RULE.attempts) {
          this.returnToTelesalesIn(state, lead, notes, attempts, actor)
          return
        }
        if (lead.stage !== 'In Process') lead.resumeStage = lead.stage
        lead.stage = 'In Process'
        lead.inProcessReason = input.outcome
        this.addTask(state, lead, 'Follow-up Call', `Call back (${input.outcome})`, input.nextCallAt!)
        this.log(lead, actor, 'Call', `${input.outcome} (attempt ${attempts} of ${RETURN_RULE.attempts} in ${RETURN_RULE.withinHours / 24} days): next call ${new Date(input.nextCallAt!).toLocaleString('en-IN')}.`)
        return
      }
      if (input.outcome === 'Not Interested') {
        if (visitHappened(lead)) this.markDeadIn(state, lead, notes, actor)
        else this.returnToTelesalesIn(state, lead, notes, 0, actor)
        return
      }
      if (lead.stage === 'In Process') this.setStage(lead, lead.resumeStage ?? 'Meeting Scheduled')
      if (input.outcome === 'Meeting Confirmed' && scheduled) {
        scheduled.confirmedAt = at
        this.log(lead, actor, 'Meeting confirmed', `${scheduled.kind} on ${new Date(scheduled.scheduledAt).toLocaleString('en-IN')} reconfirmed with the customer.`)
      } else if (input.outcome === 'Rescheduled' && scheduled) {
        const previous = scheduled.scheduledAt
        scheduled.scheduledAt = input.newVisitAt!
        scheduled.confirmedAt = at
        this.log(lead, actor, 'Rescheduled', `${scheduled.kind} moved from ${new Date(previous).toLocaleString('en-IN')} to ${new Date(input.newVisitAt!).toLocaleString('en-IN')}.`)
      } else {
        this.log(lead, actor, 'Call', `Spoke to the customer.`)
      }
    })
  }

  async addFeedback(journeyId: string, text: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (text.trim().length < 3) throw new SalesError('Write a comment first')
      lead.feedback.push({ id: makeId('FB'), text: text.trim(), author: actor.name, team: 'Sales', createdAt: now().toISOString() })
    })
  }

  // --- Visits and location tracking ---------------------------------------------------------

  async scheduleVisit(journeyId: string, kind: Exclude<VisitKind, 'Sales Meeting'>, at: string, place: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      this.future(at, kind === 'Site Visit' ? 'site visit date and time' : 'meeting date and time')
      if (!place.trim()) throw new SalesError('Add where the visit will happen')
      if (lead.visits.some(visit => visit.status === 'Scheduled')) throw new SalesError('Finish or cancel the visit already scheduled first')
      if (kind === 'Site Visit') {
        if (!['Meeting Done', 'SV Done'].includes(lead.stage)) throw new SalesError('Schedule a site visit after the meeting is done')
        if (lead.queue === 'New Lead for Land Sourcing' && lead.landSourcing?.status !== 'Land Identified') {
          throw new SalesError('Land Sourcing has not identified land yet, so there is no site to visit')
        }
      } else if (!['Meeting Done', 'SV Done', 'Interested'].includes(lead.stage)) {
        throw new SalesError('A follow-up meeting can be scheduled after the first meeting')
      }
      lead.visits.push({ id: makeId('VIS'), kind, fixedBy: 'Sales', scheduledAt: at, place: place.trim(), status: 'Scheduled', ownerId: lead.ownerId, confirmedAt: now().toISOString() })
      if (kind === 'Site Visit') this.setStage(lead, 'SV Scheduled')
      else if (lead.stage !== 'Interested') this.setStage(lead, 'Meeting Scheduled')
      this.log(lead, actor, `${kind} scheduled`, `${kind} on ${new Date(at).toLocaleString('en-IN')} at ${place.trim()}.`)
    })
  }

  /**
   * Stamps the location when the executive starts the trip, arrives and completes the visit
   * (whiteboard: used for travel allowances and for tracking the team). Completing a visit
   * raises the travel claim.
   */
  async checkIn(journeyId: string, visitId: string, point: 'start' | 'arrive' | 'complete', actor: User) {
    const state = this.read()
    const lead = this.lead(state, journeyId, actor)
    const visit = lead.visits.find(item => item.id === visitId)
    if (!visit || visit.status !== 'Scheduled') throw new SalesError('This visit is not open')
    if (visit.ownerId !== actor.id) throw new SalesError('Only the executive going to the visit can check in')
    if (point === 'start' && visit.started) throw new SalesError('The trip has already started')
    if (point === 'arrive' && (!visit.started || visit.arrived)) throw new SalesError(visit.arrived ? 'Arrival is already recorded' : 'Start the trip first')
    if (point === 'complete' && !visit.arrived) throw new SalesError('Record your arrival first')
    const at = now().toISOString()
    const stamp = await captureStamp(point === 'start' ? 'start' : 'destination', lead.customer.city, `${visit.id}-${point}`, at)
    this.change(fresh => {
      const target = this.lead(fresh, journeyId, actor).visits.find(item => item.id === visitId)!
      const freshLead = this.lead(fresh, journeyId, actor)
      if (point === 'start') target.started = stamp
      if (point === 'arrive') target.arrived = stamp
      if (point === 'complete') {
        target.completed = stamp
        target.status = 'Completed'
        const allowance = allowanceFor(target)
        if (allowance) {
          fresh.claims.push({ id: makeId('CLM'), visitId: target.id, journeyId, ownerId: target.ownerId, date: at, ...allowance, status: 'Pending Approval' })
        }
      }
      this.log(freshLead, actor, `${target.kind}: ${point === 'start' ? 'trip started' : point === 'arrive' ? 'arrived' : 'completed'}`,
        `Location recorded (${stamp.lat}, ${stamp.lng})${stamp.simulated ? ' — simulated in preview' : ''}.`)
    })
  }

  async cancelVisit(journeyId: string, visitId: string, reason: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      const visit = lead.visits.find(item => item.id === visitId)
      if (!visit || visit.status !== 'Scheduled') throw new SalesError('This visit is not open')
      if (reason.trim().length < 5) throw new SalesError('Say why the visit is cancelled')
      visit.status = 'Cancelled'
      if (lead.stage === 'SV Scheduled') this.setStage(lead, 'Meeting Done')
      this.log(lead, actor, `${visit.kind} cancelled`, reason.trim())
    })
  }

  // --- Meeting ------------------------------------------------------------------------------

  async saveMeetingForm(journeyId: string, customer: CustomerDetails, profile: MeetingProfile, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      lead.customer = { ...customer, pincode: customer.pincode.trim() }
      lead.profile = {
        ...profile,
        groupKind: profile.customerType === 'Group of People' ? profile.groupKind : '',
        registrationStatus: profile.plotRegistered === 'No' ? profile.registrationStatus : '',
      }
      this.log(lead, actor, 'Meeting details saved', 'Customer and requirement details updated.')
    })
  }

  async completeMeeting(journeyId: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (lead.stage !== 'Meeting Scheduled') throw new SalesError('Only a scheduled meeting can be marked done')
      const meeting = [...lead.visits].filter(visit => MEETINGS.includes(visit.kind)).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0]
      const missing = meetingFormMissing(lead)
      if (meeting?.status !== 'Completed') missing.unshift('Meeting check-in: Start meeting, Arrived at client location, Meeting completed')
      if (missing.length) throw new SalesError('Complete these before marking the meeting done', missing)
      this.advanceTo(state, lead, 'Meeting Done', actor)
      const action = lead.profile.nextAction
      if (action === 'Follow-up Call') this.addTask(state, lead, 'Follow-up Call', 'Follow-up call after the meeting', new Date(now().getTime() + 2 * 86_400_000).toISOString())
      if (action === 'Quotation') this.addTask(state, lead, 'Quotation', 'Prepare the quotation with the architect', new Date(now().getTime() + 3 * 86_400_000).toISOString())
      this.log(lead, actor, 'Meeting done', `Meeting completed. Next action: ${action}.`)
    })
  }

  // --- Site visit ---------------------------------------------------------------------------

  async saveSiteVisitReport(journeyId: string, report: SiteVisitReport, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      lead.siteVisit = {
        ...report,
        roadFacingWidth: report.roadAccess === 'Yes' ? report.roadFacingWidth : '',
        roadWidth: report.roadAccess === 'Yes' ? report.roadWidth : '',
      }
      this.log(lead, actor, 'Site visit details saved', 'Property details updated.')
    })
  }

  async completeSiteVisit(journeyId: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (lead.stage !== 'SV Scheduled') throw new SalesError('Only a scheduled site visit can be marked done')
      const visit = [...lead.visits].filter(item => item.kind === 'Site Visit').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0]
      const missing = siteVisitMissing(lead.siteVisit)
      if (visit?.status !== 'Completed') missing.unshift('Site visit check-in: Start site visit, Arrived at site, Site visit completed')
      if (missing.length) throw new SalesError('Complete these before marking the site visit done', missing)
      this.advanceTo(state, lead, 'SV Done', actor)
      this.log(lead, actor, 'Site visit done', `Soil test (verbal): ${lead.siteVisit.soilTest}; borewell: ${lead.siteVisit.borewell}.`)
    })
  }

  // --- Architecture, quotation and closing --------------------------------------------------

  /** Interested: the client's details go to the architect, who takes the requirements on a call with the customer and Sales. */
  async markInterested(journeyId: string, architect: string, callAt: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (!['Meeting Done', 'SV Done'].includes(lead.stage)) throw new SalesError('Mark interested after the meeting or site visit')
      if (!architect.trim()) throw new SalesError('Choose the architect')
      this.future(callAt, 'architect call date and time')
      lead.architecture = { architect: architect.trim(), callAt }
      this.advanceTo(state, lead, 'Interested', actor)
      this.addTask(state, lead, 'Architect Call', `Call with ${architect.trim()} and the customer to take requirements`, callAt)
      this.log(lead, actor, 'Interested', `Customer interested; architect call with ${architect.trim()} fixed.`)
    })
  }

  /**
   * The architect uploads the quotation (the preview lets Sales upload it for them until the
   * Architecture portal exists). The actual price may vary ±20% from it.
   */
  async uploadQuotation(journeyId: string, input: { number: string; amount: number; fileName: string }, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (lead.stage !== 'Interested' || !lead.architecture) throw new SalesError('The quotation comes after the customer is interested and the architect is involved')
      if (!input.number.trim()) throw new SalesError('Add the quotation number')
      if (!(input.amount > 0)) throw new SalesError('Add the quotation amount')
      if (!input.fileName.trim()) throw new SalesError('Attach the quotation file')
      lead.architecture = {
        ...lead.architecture,
        quotation: { number: input.number.trim(), amount: input.amount, fileName: input.fileName.trim(), uploadedBy: lead.architecture.architect, uploadedAt: now().toISOString() },
      }
      this.closeTasks(state, lead.journeyId, ['Architect Call', 'Quotation'])
      this.log(lead, actor, 'Quotation uploaded', `${lead.architecture.architect} uploaded quotation ${input.number.trim()} for ₹${input.amount.toLocaleString('en-IN')}.`)
    })
  }

  /** Sales shares the architect's quotation with the client on WhatsApp; the journey moves to Under Negotiation. */
  async shareQuotation(journeyId: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      const quotation = lead.architecture?.quotation
      if (lead.stage !== 'Interested' || !quotation) throw new SalesError('The architect has not uploaded a quotation yet')
      lead.architecture = { ...lead.architecture!, shared: { at: now().toISOString(), via: 'WhatsApp', by: actor.name } }
      this.advanceTo(state, lead, 'Under Negotiation', actor)
      this.addTask(state, lead, 'Follow-up Call', 'Follow up on the quotation', new Date(now().getTime() + 2 * 86_400_000).toISOString())
      this.log(lead, actor, 'Quotation shared', `Quotation ${quotation.number} for ₹${quotation.amount.toLocaleString('en-IN')} shared on WhatsApp; now under negotiation.`)
    })
  }

  /** Closed: the customer pays the token amount; Sales fixes a handover call with the architect. */
  async closeDeal(journeyId: string, input: ClosingInput, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (lead.stage !== 'Under Negotiation') throw new SalesError('Close the deal from Under Negotiation')
      if (!(input.tokenAmount > 0)) throw new SalesError('Enter the token amount received')
      if (!input.paymentReference.trim()) throw new SalesError('Add the payment reference (UTR or receipt number)')
      this.future(input.handoverCallAt, 'handover call date and time')
      lead.closing = { tokenAmount: input.tokenAmount, paymentReference: input.paymentReference.trim(), paidAt: now().toISOString(), handoverCallAt: input.handoverCallAt }
      this.closeTasks(state, lead.journeyId)
      lead.visits.forEach(visit => { if (visit.status === 'Scheduled') visit.status = 'Cancelled' })
      this.advanceTo(state, lead, 'Closed', actor)
      this.addTask(state, lead, 'Handover Call', `Handover call: customer, ${lead.architecture?.architect ?? 'architect'} and Sales`, input.handoverCallAt)
      this.log(lead, actor, 'Closed', `Token ₹${input.tokenAmount.toLocaleString('en-IN')} received (${input.paymentReference.trim()}); handover call fixed.`)
    })
  }

  private markDeadIn(state: SalesState, lead: SalesLead, reason: string, actor: User) {
    lead.deadReason = reason
    this.setStage(lead, 'Dead')
    lead.visits.forEach(visit => { if (visit.status === 'Scheduled') visit.status = 'Cancelled' })
    this.closeTasks(state, lead.journeyId)
    this.log(lead, actor, 'Marked dead', reason)
  }

  /** Only after a meeting or site visit has happened; before that, use returnToTelesales. */
  async markDead(journeyId: string, reason: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (!visitHappened(lead)) throw new SalesError('No meeting or site visit has happened yet, so the journey goes back to Telesales instead of Dead')
      if (reason.trim().length < 5) throw new SalesError('Say why the journey is dead')
      lead.feedback.push({ id: makeId('FB'), text: reason.trim(), author: actor.name, team: 'Sales', createdAt: now().toISOString() })
      this.markDeadIn(state, lead, reason.trim(), actor)
    })
  }

  /** Before any meeting or site visit: send the journey back to Telesales ("Sales rejected") with a comment. */
  async returnToTelesales(journeyId: string, reason: string, actor: User) {
    this.change(state => {
      const lead = this.lead(state, journeyId, actor)
      if (visitHappened(lead)) throw new SalesError('A meeting or site visit has happened, so mark the journey dead instead')
      if (reason.trim().length < 10) throw new SalesError('Add a proper comment for Telesales (at least 10 characters)')
      lead.feedback.push({ id: makeId('FB'), text: reason.trim(), author: actor.name, team: 'Sales', createdAt: now().toISOString() })
      this.returnToTelesalesIn(state, lead, reason.trim(), 0, actor)
    })
  }

  async markAlertsRead(alertIds: string[], actor: User) {
    this.change(state => {
      state.alerts.forEach(alert => { if (alertIds.includes(alert.id) && !alert.readBy.includes(actor.id)) alert.readBy.push(actor.id) })
    })
  }

  // --- Tasks, ownership and travel claims ---------------------------------------------------

  async completeTask(taskId: string, actor: User) {
    this.change(state => {
      const task = state.tasks.find(item => item.id === taskId)
      if (!task || task.status !== 'Open') throw new SalesError('This task is not open')
      this.lead(state, task.journeyId, actor, { editable: task.type === 'Handover Call' ? false : true })
      task.status = 'Done'
    })
  }

  async reassign(journeyId: string, ownerId: string, reason: string, actor: User) {
    this.change(state => {
      if (actor.role === 'executive') throw new SalesError('Only a Team Lead or Manager can reassign journeys')
      const lead = this.lead(state, journeyId, actor)
      const owner = previewUsers.find(user => user.id === ownerId)
      if (!owner || !visibleOwnerIds(actor, previewUsers).has(owner.id)) throw new SalesError('Choose someone in your team')
      if (owner.id === lead.ownerId) throw new SalesError('The journey already belongs to this person')
      if (reason.trim().length < 5) throw new SalesError('Add a reason for the reassignment')
      const previous = previewUsers.find(user => user.id === lead.ownerId)?.name ?? lead.ownerId
      lead.ownerId = owner.id
      state.tasks.forEach(task => { if (task.journeyId === journeyId && task.status === 'Open') task.ownerId = owner.id })
      lead.visits.forEach(visit => { if (visit.status === 'Scheduled' && !visit.started) visit.ownerId = owner.id })
      this.log(lead, actor, 'Reassigned', `From ${previous} to ${owner.name}: ${reason.trim()}`)
    })
  }

  async decideClaim(claimId: string, approve: boolean, note: string, actor: User) {
    this.change(state => {
      if (actor.role === 'executive') throw new SalesError('Only a Team Lead or Manager can approve travel claims')
      const claim = state.claims.find(item => item.id === claimId)
      if (!claim || !visibleOwnerIds(actor, previewUsers).has(claim.ownerId)) throw new SalesError('Claim not found')
      if (claim.ownerId === actor.id) throw new SalesError('You cannot approve your own travel claim')
      if (claim.status !== 'Pending Approval') throw new SalesError('This claim has already been decided')
      if (!approve && note.trim().length < 5) throw new SalesError('Say why the claim is rejected')
      claim.status = approve ? 'Approved' : 'Rejected'
      claim.decidedBy = actor.name
      claim.decidedAt = now().toISOString()
      if (note.trim()) claim.note = note.trim()
    })
  }
}

export const salesService = new LocalSalesService()

export function isMeetingVisit(visit: Visit) {
  return MEETINGS.includes(visit.kind)
}

export { isReadOnly }
