import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState, previewUsers, TELESALES_SENT_JOURNEYS } from '../data/fixtures'
import { allowanceFor, isNewLead, meetingFormMissing, siteVisitMissing, STAGES, visibleLeads } from '../lib/rules'
import { LocalSalesService, SalesError } from '../services/salesService'
import type { MeetingProfile, SalesLead, SiteVisitReport } from '../types'

const [ishaan, tanvi, manish, rakesh] = previewUsers
const service = new LocalSalesService()
const lead = async (journeyId: string) => (await service.getState()).leads.find(item => item.journeyId === journeyId)!
const inFuture = (days: number, hour = 11) => new Date(Date.UTC(2026, 10, 16 + days, hour - 5, 30)).toISOString()

const fullProfile: MeetingProfile = {
  customerType: 'Individual', groupKind: '', landStatus: 'Own Land', propertyType: 'Duplex Villa', plotRegistered: 'Yes',
  registrationStatus: '', govtApproval: 'Yes', budget: '₹4.2 Cr', paymentPlan: 'Self', nextAction: 'Site Visit',
  plotSize: '3,600 sq ft', dimensions: '60 ft × 60 ft', approxBuiltArea: '5,000 sq ft', decisionMaker: 'Self',
}
const fullReport: SiteVisitReport = {
  actualSiteVisited: 'Yes', roadAccess: 'Yes', roadFacingWidth: '60 ft', roadWidth: '40 ft',
  photos: ['plot.jpg', 'road.jpg'], propertyDocuments: [], soilTest: 'OK', borewell: 'Yes',
}

beforeEach(() => localStorage.clear())

describe('Sales demo data', () => {
  const state = createInitialState()

  it('continues exactly the 13 journeys the Telesales demo sends to Sales', () => {
    expect(TELESALES_SENT_JOURNEYS).toEqual([
      'KX-2026-000244', 'KX-2026-000245', 'KX-2026-000248', 'KX-2026-000250', 'KX-2026-000251', 'KX-2026-000256', 'KX-2026-000257',
      'KX-2026-000260', 'KX-2026-000264', 'KX-2026-000266', 'KX-2026-000270', 'KX-2026-000272', 'KX-2026-000278',
    ])
    const landSourcing = state.leads.filter(item => item.queue === 'New Lead for Land Sourcing').map(item => item.journeyId).sort()
    // The same 10 journeys the Land Sourcing demo works on.
    expect(landSourcing).toEqual(['KX-2026-000244', 'KX-2026-000248', 'KX-2026-000250', 'KX-2026-000256', 'KX-2026-000257', 'KX-2026-000260', 'KX-2026-000264', 'KX-2026-000266', 'KX-2026-000272', 'KX-2026-000278'])
    const identified = state.leads.filter(item => item.landSourcing?.status === 'Land Identified').map(item => item.journeyId).sort()
    expect(identified).toEqual(['KX-2026-000257', 'KX-2026-000260', 'KX-2026-000266'])
  })

  it('uses the shared reference formats and keeps references valid', () => {
    const journeys = new Set(state.leads.map(item => item.journeyId))
    const owners = new Set(previewUsers.map(user => user.id))
    for (const item of state.leads) {
      expect(item.journeyId).toMatch(/^KX-2026-\d{6}$/)
      expect(item.reference).toBe(item.journeyId.replace('KX-', 'KX-SH-'))
      if (item.landSourcing) expect(item.landSourcing.reference).toBe(item.journeyId.replace('KX-', 'KX-LS-'))
      expect(item.queue === 'New Leads').toBe(item.telesales.landStatus === 'Own Land')
      expect(owners.has(item.ownerId)).toBe(true)
      expect(item.visits.some(visit => visit.kind === 'Sales Meeting')).toBe(true)
      expect(item.feedback[0].team).toBe('Telesales')
    }
    expect(state.tasks.every(task => journeys.has(task.journeyId))).toBe(true)
    expect(state.claims.every(claim => journeys.has(claim.journeyId))).toBe(true)
  })

  it('shows every pipeline stage, and done stages have their data', () => {
    expect(new Set(state.leads.map(item => item.stage))).toEqual(new Set(STAGES))
    for (const item of state.leads.filter(entry => ['Meeting Done', 'SV Scheduled', 'SV Done', 'Interested', 'Under Negotiation', 'Closed'].includes(entry.stage))) {
      expect(meetingFormMissing(item)).toEqual([])
    }
    for (const item of state.leads.filter(entry => ['SV Done', 'Interested', 'Under Negotiation', 'Closed'].includes(entry.stage))) {
      expect(siteVisitMissing(item.siteVisit)).toEqual([])
    }
    expect(state.leads.filter(entry => entry.stage === 'Closed').every(entry => entry.closing && entry.architecture?.quotation)).toBe(true)
  })

  it('raises a travel claim for every completed visit, priced by the allowance policy', () => {
    const completed = state.leads.flatMap(item => item.visits.filter(visit => visit.status === 'Completed'))
    expect(state.claims).toHaveLength(completed.length)
    for (const claim of state.claims) {
      const visit = completed.find(item => item.id === claim.visitId)!
      expect(allowanceFor(visit)).toEqual({ oneWayKm: claim.oneWayKm, claimKm: claim.claimKm, amount: claim.amount })
    }
  })
})

describe('Sales rules', () => {
  it('asks own-land meetings for the plot questions, and groups for the group type', () => {
    const base = createInitialState().leads.find(item => item.journeyId === 'KX-2026-000270')!
    expect(meetingFormMissing({ customer: base.customer, profile: fullProfile })).toEqual([])
    expect(meetingFormMissing({ customer: base.customer, profile: { ...fullProfile, plotRegistered: 'No' } })).toContain('Registration status')
    expect(meetingFormMissing({ customer: base.customer, profile: { ...fullProfile, customerType: 'Group of People' } })).toContain('Group type (family, friends or community)')
    const sourcing = { ...fullProfile, landStatus: 'Need to Source Land' as const, plotRegistered: '' as const, govtApproval: '' as const, dimensions: '' }
    expect(meetingFormMissing({ customer: base.customer, profile: sourcing })).toEqual([])
  })

  it('needs road widths only with road access, and always 2 photos', () => {
    expect(siteVisitMissing(fullReport)).toEqual([])
    expect(siteVisitMissing({ ...fullReport, roadAccess: 'No', roadFacingWidth: '', roadWidth: '' })).toEqual([])
    expect(siteVisitMissing({ ...fullReport, roadWidth: '' })).toContain('Road width')
    expect(siteVisitMissing({ ...fullReport, photos: ['one.jpg'] })).toContain('2 images of plot and road facing')
  })

  it('scopes journeys: executives their own, team leads their team, managers everyone', () => {
    const state = createInitialState()
    const owners = (user: typeof ishaan) => new Set(visibleLeads(state, user, previewUsers).map(item => item.ownerId))
    expect(owners(ishaan)).toEqual(new Set(['s-ishaan']))
    expect(owners(manish)).toEqual(new Set(['s-ishaan', 's-tanvi', 's-manish']))
    expect(visibleLeads(state, rakesh, previewUsers)).toHaveLength(state.leads.length)
  })
})

describe('Sales journey through the service', () => {
  it('moves to In Process on RNR and back once the meeting is confirmed', async () => {
    await expect(service.logCall('KX-2026-000270', { outcome: 'RNR', notes: 'No answer twice' }, ishaan)).rejects.toThrow('Choose the next call date and time')
    await service.logCall('KX-2026-000270', { outcome: 'RNR', notes: 'No answer twice', nextCallAt: inFuture(1) }, ishaan)
    let current = await lead('KX-2026-000270')
    expect(current).toMatchObject({ stage: 'In Process', inProcessReason: 'RNR', resumeStage: 'Meeting Scheduled' })
    expect(current.feedback.at(-1)).toMatchObject({ team: 'Sales', outcome: 'RNR', author: 'Ishaan Bhatia' })
    await service.logCall('KX-2026-000270', { outcome: 'Meeting Confirmed', notes: 'Confirmed for Sunday' }, ishaan)
    current = await lead('KX-2026-000270')
    expect(current.stage).toBe('Meeting Scheduled')
    expect(isNewLead(current)).toBe(false)
    const tasks = (await service.getState()).tasks.filter(task => task.journeyId === 'KX-2026-000270' && task.status === 'Open')
    expect(tasks).toEqual([])
  })

  it('takes an own-land journey from meeting to token payment', async () => {
    const id = 'KX-2026-000270'
    let current = await lead(id)
    const meeting = current.visits[0].id
    await expect(service.completeMeeting(id, ishaan)).rejects.toThrow(SalesError)
    await expect(service.checkIn(id, meeting, 'arrive', ishaan)).rejects.toThrow('Start the trip first')
    await expect(service.checkIn(id, meeting, 'start', tanvi)).rejects.toThrow('Journey not found')
    for (const point of ['start', 'arrive', 'complete'] as const) await service.checkIn(id, meeting, point, ishaan)
    const claims = (await service.getState()).claims.filter(claim => claim.visitId === meeting)
    expect(claims).toHaveLength(1)
    expect(claims[0]).toMatchObject({ status: 'Pending Approval', ownerId: 's-ishaan' })
    expect(claims[0].amount).toBeGreaterThan(0)

    current = await lead(id)
    await service.saveMeetingForm(id, current.customer, fullProfile, ishaan)
    await service.completeMeeting(id, ishaan)
    expect((await lead(id)).stage).toBe('Meeting Done')

    await service.scheduleVisit(id, 'Site Visit', inFuture(8), 'Customer plot, Sector 65', ishaan)
    current = await lead(id)
    expect(current.stage).toBe('SV Scheduled')
    const sv = current.visits.find(visit => visit.kind === 'Site Visit')!.id
    await service.saveSiteVisitReport(id, { ...fullReport, photos: ['plot.jpg'] }, ishaan)
    await expect(service.completeSiteVisit(id, ishaan)).rejects.toMatchObject({ missing: expect.arrayContaining(['2 images of plot and road facing']) })
    for (const point of ['start', 'arrive', 'complete'] as const) await service.checkIn(id, sv, point, ishaan)
    await service.saveSiteVisitReport(id, fullReport, ishaan)
    await service.completeSiteVisit(id, ishaan)
    expect((await lead(id)).stage).toBe('SV Done')

    await service.markInterested(id, 'Ar. Nikhil Bose', inFuture(10), ishaan)
    await expect(service.recordEstimate(id, 1_00_00_000, 2_00_00_000, '', ishaan)).rejects.toThrow('wider than ±20%')
    await service.recordEstimate(id, 4_00_00_000, 6_00_00_000, 'G+2 with basement', ishaan)
    await service.shareQuotation(id, 'QT-000270', 5_10_00_000, ishaan)
    expect((await lead(id)).stage).toBe('Under Negotiation')
    await service.closeDeal(id, { tokenAmount: 5_00_000, paymentReference: 'UTR123', handoverCallAt: inFuture(14) }, ishaan)
    current = await lead(id)
    expect(current.stage).toBe('Closed')
    expect(current.closing).toMatchObject({ tokenAmount: 5_00_000, paymentReference: 'UTR123' })
    await expect(service.logCall(id, { outcome: 'Spoke to Customer', notes: 'Checking in' }, ishaan)).rejects.toThrow('read-only')
  })

  it('waits for Land Sourcing before a site visit on a land sourcing journey', async () => {
    // Neha Kapoor's meeting is done but Land Sourcing hasn't identified land yet.
    await expect(service.scheduleVisit('KX-2026-000244', 'Site Visit', inFuture(3), 'Zirakpur', ishaan)).rejects.toThrow('Land Sourcing has not identified land yet')
  })

  it('marks a journey dead when the customer is not interested', async () => {
    await service.logCall('KX-2026-000264', { outcome: 'Not Interested', notes: 'Postponed plans by two years' }, ishaan)
    const current: SalesLead = await lead('KX-2026-000264')
    expect(current.stage).toBe('Dead')
    expect(current.deadReason).toBe('Postponed plans by two years')
    expect(current.visits.every(visit => visit.status !== 'Scheduled')).toBe(true)
  })

  it('lets only Team Leads and Managers reassign and approve claims, never their own', async () => {
    await expect(service.reassign('KX-2026-000270', 's-tanvi', 'Workload balance', ishaan)).rejects.toThrow('Only a Team Lead or Manager')
    await service.reassign('KX-2026-000270', 's-tanvi', 'Workload balance', manish)
    expect((await lead('KX-2026-000270')).ownerId).toBe('s-tanvi')
    const state = await service.getState()
    const ishaanClaim = state.claims.find(claim => claim.ownerId === 's-ishaan' && claim.status === 'Pending Approval')!
    await expect(service.decideClaim(ishaanClaim.id, true, '', ishaan)).rejects.toThrow('Only a Team Lead or Manager')
    await service.decideClaim(ishaanClaim.id, true, '', manish)
    expect((await service.getState()).claims.find(claim => claim.id === ishaanClaim.id)).toMatchObject({ status: 'Approved', decidedBy: 'Manish Kohli' })
    const manishClaim = state.claims.find(claim => claim.ownerId === 's-manish' && claim.status === 'Pending Approval')
    if (manishClaim) await expect(service.decideClaim(manishClaim.id, true, '', manish)).rejects.toThrow('your own')
  })
})
