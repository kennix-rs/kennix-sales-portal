/**
 * Sales rules shared by the service (which enforces them) and the screens (which explain them).
 * Every gate returns the list of what's missing, like the Telesales qualification gate.
 */
import type {
  CallOutcome, CustomerDetails, InProcessReason, MeetingProfile, PackageType, SalesLead, SalesStage, SalesState, SiteVisitReport, StageAlert, Task, User, Visit,
} from '../types'
import { now, sameDay } from './utils'

/** The pipeline-by-stage columns. "Sales Rejected" journeys have left Sales and are listed separately. */
export const STAGES: SalesStage[] = [
  'In Process', 'Meeting Scheduled', 'Meeting Done', 'SV Scheduled', 'SV Done', 'Interested', 'Under Negotiation', 'Closed', 'Dead',
]
/** Construction rate per sq ft for each package, as on the website and in the backend's `Package` table. */
export const PACKAGE_RATES: Record<PackageType, number> = { Basic: 1800, Standard: 2000, Luxury: 2200, 'Ultra Luxury': 2500 }

/** Indicative construction cost: built-up area × the package rate (null if the area isn't a number yet). */
export function indicativeCost(approxBuiltArea: string, packageType: PackageType | '') {
  const area = Number(approxBuiltArea.replace(/[^\d.]/g, ''))
  return packageType && area > 0 ? Math.round(area * PACKAGE_RATES[packageType]) : null
}

export const IN_PROCESS_REASONS: InProcessReason[] = ['RNR', 'Plan Postponed', 'Call Back Later', 'Switch Off']

export function isInProcessOutcome(outcome: CallOutcome): outcome is InProcessReason {
  return (IN_PROCESS_REASONS as string[]).includes(outcome)
}

/** Closed, Dead and Sales Rejected journeys are read-only in Sales. */
export function isReadOnly(lead: SalesLead) {
  return lead.stage === 'Closed' || lead.stage === 'Dead' || lead.stage === 'Sales Rejected'
}

/**
 * Voice notes: after 5 In Process attempts (RNR, Plan Postponed, Call Back Later, Switch Off)
 * within 3 days, the journey goes back to Telesales as "Sales rejected", with Sales' comment.
 */
export const RETURN_RULE = { attempts: 5, withinHours: 72 }

export function recentInProcessAttempts(lead: Pick<SalesLead, 'calls'>, at = now()) {
  const since = at.getTime() - RETURN_RULE.withinHours * 3600_000
  return lead.calls.filter(call => isInProcessOutcome(call.outcome) && new Date(call.at).getTime() >= since).length
}

/**
 * A customer dropped before any meeting or site visit has happened goes back to Telesales
 * ("Sales rejected"); only a journey dropped after a meeting or site visit is Dead.
 */
export function visitHappened(lead: Pick<SalesLead, 'visits'>) {
  return lead.visits.some(visit => visit.status === 'Completed')
}

/** Stages that alert Team Leads and Managers (voice notes: "auto pop-up to the admin"). */
export const ALERT_STAGES: SalesStage[] = ['Meeting Done', 'SV Done', 'Interested', 'Under Negotiation', 'Closed']

export function alertsFor(state: SalesState, user: User, users: User[]): StageAlert[] {
  if (user.role === 'executive') return []
  const owners = visibleOwnerIds(user, users)
  return state.alerts.filter(alert => owners.has(alert.ownerId)).sort((a, b) => b.at.localeCompare(a.at))
}

export function customerMissing(customer: CustomerDetails) {
  const missing: string[] = []
  if (!customer.name.trim()) missing.push('Customer name')
  if (customer.mobile.replace(/\D/g, '').length < 10) missing.push('Mobile number')
  if (!customer.location.trim()) missing.push('Location')
  if (!customer.city.trim()) missing.push('City')
  if (!customer.state.trim()) missing.push('State')
  if (!/^\d{6}$/.test(customer.pincode)) missing.push('6-digit pincode')
  return missing
}

/** Everything the meeting form needs before the meeting can be marked done. */
export function meetingFormMissing(lead: Pick<SalesLead, 'customer' | 'profile'>) {
  const p: MeetingProfile = lead.profile
  const missing = customerMissing(lead.customer)
  if (!p.customerType) missing.push('Individual or group')
  if (p.customerType === 'Group of People' && !p.groupKind) missing.push('Group type (family, friends or community)')
  if (!p.landStatus) missing.push('Own land or need to source land')
  if (!p.propertyType) missing.push('Property type')
  if (p.landStatus === 'Own Land') {
    if (!p.plotRegistered) missing.push('Plot registered in customer name')
    if (p.plotRegistered === 'No' && !p.registrationStatus) missing.push('Registration status')
    if (!p.govtApproval) missing.push('Government approval')
    if (!p.dimensions.trim()) missing.push('Plot dimensions')
  }
  if (!p.budget.trim()) missing.push('Customer budget')
  if (!p.paymentPlan) missing.push('Payment plan')
  if (!p.plotSize.trim()) missing.push('Plot size')
  if (!p.approxBuiltArea.trim()) missing.push('Approx. built area')
  if (!p.packageType) missing.push('Type of package')
  if (!p.decisionMaker) missing.push('Decision maker')
  if (!p.nextAction) missing.push('Next action')
  return missing
}

export function siteVisitMissing(report: SiteVisitReport) {
  const missing: string[] = []
  if (report.actualSiteVisited !== 'Yes') missing.push('Actual site visited')
  if (!report.roadAccess) missing.push('Road access')
  if (report.roadAccess === 'Yes') {
    if (!report.roadFacingWidth.trim()) missing.push('Road-facing width of plot')
    if (!report.roadWidth) missing.push('Road width')
  }
  if (report.photos.length < 2) missing.push('2 images of plot and road facing')
  if (!report.soilTest) missing.push('Verbal soil test confirmation')
  if (!report.borewell) missing.push('Borewell provision')
  return missing
}

export function latestVisit(lead: SalesLead, kinds: Visit['kind'][]) {
  return [...lead.visits].filter(visit => kinds.includes(visit.kind)).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0]
}

export function nextScheduledVisit(lead: SalesLead) {
  return lead.visits.filter(visit => visit.status === 'Scheduled').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]
}

// --- Visibility ---------------------------------------------------------------------------

/** Executives see their own journeys, Team Leads their reporting team, Managers everything. */
export function visibleOwnerIds(user: User, users: User[]) {
  if (user.role === 'manager') return new Set(users.map(item => item.id))
  if (user.role === 'team_lead') return new Set([user.id, ...users.filter(item => item.managerId === user.id).map(item => item.id)])
  return new Set([user.id])
}

export function visibleLeads(state: SalesState, user: User, users: User[]) {
  const owners = visibleOwnerIds(user, users)
  return state.leads.filter(lead => owners.has(lead.ownerId))
}

// --- Dashboard tiles (whiteboard: New Lead · Overdue Task · Calendar · Interested · Land Sourcing Leads) ---

/** Newly received journeys whose Telesales meeting Sales hasn't reconfirmed yet. */
export function isNewLead(lead: SalesLead) {
  if (lead.stage !== 'Meeting Scheduled') return false
  const first = lead.visits.find(visit => visit.kind === 'Sales Meeting')
  return !!first && first.status === 'Scheduled' && !first.confirmedAt
}

export function isOverdueTask(task: Task, at = now()) {
  return task.status === 'Open' && new Date(task.dueAt) < at
}

/** A visit whose time has passed but that was never completed or cancelled. */
export function isOverdueVisit(visit: Visit, at = now()) {
  return visit.status === 'Scheduled' && new Date(visit.scheduledAt).getTime() + 2 * 3600_000 < at.getTime()
}

export function isTodayVisit(visit: Visit, at = now()) {
  return visit.status !== 'Cancelled' && sameDay(new Date(visit.scheduledAt), at)
}

export function isSalesRejected(lead: SalesLead) {
  return lead.stage === 'Sales Rejected'
}

export function isLandSourcingLead(lead: SalesLead) {
  return lead.queue === 'New Lead for Land Sourcing' && !isReadOnly(lead)
}

// --- Travel allowance ---------------------------------------------------------------------

/**
 * Preview policy, to be confirmed by the business: road distance is taken as 1.3 × the straight
 * line from where the trip started to where the executive arrived, doubled for the return trip,
 * at ₹9 per km.
 */
export const ALLOWANCE_POLICY = { ratePerKm: 9, roadFactor: 1.3, returnTrip: true }

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (value: number) => (value * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

export function allowanceFor(visit: Visit) {
  if (!visit.started || !visit.arrived) return null
  const oneWayKm = Math.round(haversineKm(visit.started, visit.arrived) * ALLOWANCE_POLICY.roadFactor * 10) / 10
  const claimKm = Math.round(oneWayKm * (ALLOWANCE_POLICY.returnTrip ? 2 : 1) * 10) / 10
  return { oneWayKm, claimKm, amount: Math.round(claimKm * ALLOWANCE_POLICY.ratePerKm) }
}
