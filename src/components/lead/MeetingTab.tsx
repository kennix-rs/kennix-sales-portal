import { CalendarPlus, CheckCircle2, Save } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { indicativeCost, meetingFormMissing, PACKAGE_RATES } from '../../lib/rules'
import { formatINR, fromLocalInput } from '../../lib/utils'
import { isMeetingVisit, salesService } from '../../services/salesService'
import type {
  CustomerDetails, DecisionMaker, GroupKind, LandStatus, MeetingProfile, NextAction, PackageType, PaymentPlan, RegistrationStatus, SalesLead,
  SalesPropertyType, YesNo,
} from '../../types'
import { ChoiceGroup, Missing, Question } from '../sales'
import { Button, Card, Field } from '../ui'
import { VisitTracker } from './VisitTracker'

const YES_NO = ['Yes', 'No'] as const
const PACKAGES: readonly PackageType[] = ['Basic', 'Standard', 'Luxury', 'Ultra Luxury']

/** Whiteboard "Meeting fixed lead flow": confirm the customer box, capture the requirement, pick the next action. */
export function MeetingTab({ lead, readOnly }: { lead: SalesLead; readOnly: boolean }) {
  const { user } = useAuth()
  const { run } = useData()
  const [customer, setCustomer] = useState<CustomerDetails>(lead.customer)
  const [profile, setProfile] = useState<MeetingProfile>(lead.profile)
  const [followUpAt, setFollowUpAt] = useState('')
  const [followUpPlace, setFollowUpPlace] = useState(`${lead.customer.location}, ${lead.customer.city}`)
  if (!user) return null
  const meetings = lead.visits.filter(isMeetingVisit).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  const missing = meetingFormMissing({ customer, profile })
  const editable = !readOnly && ['In Process', 'Meeting Scheduled', 'Meeting Done'].includes(lead.stage)
  const set = <K extends keyof MeetingProfile>(key: K, value: MeetingProfile[K]) => setProfile(current => ({ ...current, [key]: value }))
  const setC = (key: keyof CustomerDetails, value: string) => setCustomer(current => ({ ...current, [key]: value }))
  const save = () => run(() => salesService.saveMeetingForm(lead.journeyId, customer, profile, user), 'Meeting details saved')
  const complete = () => run(async () => {
    await salesService.saveMeetingForm(lead.journeyId, customer, profile, user)
    await salesService.completeMeeting(lead.journeyId, user)
  }, 'Meeting marked done')
  const ownLand = profile.landStatus === 'Own Land'
  const cost = indicativeCost(profile.approxBuiltArea, profile.packageType)

  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-sm font-bold text-slate-900">Meetings</h2>
        <p className="mt-1 text-xs text-slate-500">Reconfirm by logging a call. On the day tap Start meeting, Arrived at client location and Meeting completed; each step saves your location for the travel allowance.</p>
        <div className="mt-4 space-y-3">{meetings.map(visit => <VisitTracker key={visit.id} lead={lead} visit={visit} readOnly={readOnly}/>)}</div>
      </Card>
      {!readOnly && ['Meeting Done', 'SV Done', 'Interested'].includes(lead.stage) && !lead.visits.some(visit => visit.status === 'Scheduled') && <Card className="p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarPlus size={16}/> Schedule a follow-up meeting</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Date and time" required><input type="datetime-local" value={followUpAt} onChange={event => setFollowUpAt(event.target.value)}/></Field>
          <Field label="Place" required><input value={followUpPlace} onChange={event => setFollowUpPlace(event.target.value)}/></Field>
        </div>
        <Button className="mt-3" variant="secondary" onClick={() => run(() => salesService.scheduleVisit(lead.journeyId, 'Follow-up Meeting', fromLocalInput(followUpAt), followUpPlace, user), 'Follow-up meeting scheduled')}>Schedule meeting</Button>
      </Card>}
    </div>

    <Card>
      <div className="section-title"><div><h2>Meeting details</h2><p>Fields marked * are needed to mark the meeting done</p></div></div>
      <fieldset disabled={!editable} className="space-y-5 p-4">
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Customer</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer name" required><input value={customer.name} onChange={event => setC('name', event.target.value)}/></Field>
            <Field label="Mobile number" required><input value={customer.mobile} onChange={event => setC('mobile', event.target.value)} inputMode="tel"/></Field>
            <Field label="Alternate number"><input value={customer.alternateMobile} onChange={event => setC('alternateMobile', event.target.value)} inputMode="tel"/></Field>
            <Field label="Email"><input value={customer.email} onChange={event => setC('email', event.target.value)} type="email"/></Field>
            <Field label="Location" required><input value={customer.location} onChange={event => setC('location', event.target.value)}/></Field>
            <Field label="City" required><input value={customer.city} onChange={event => setC('city', event.target.value)}/></Field>
            <Field label="State" required><input value={customer.state} onChange={event => setC('state', event.target.value)}/></Field>
            <Field label="Pincode" required><input value={customer.pincode} onChange={event => setC('pincode', event.target.value)} inputMode="numeric" maxLength={6}/></Field>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Requirement</h3>
          <Question label="Who is building" required>
            <ChoiceGroup label="Who is building" name="customerType" options={['Individual', 'Group of People'] as const} value={profile.customerType} onChange={value => set('customerType', value)}/>
            {profile.customerType === 'Group of People' && <select className="input max-w-xs" aria-label="Group type" value={profile.groupKind} onChange={event => set('groupKind', event.target.value as GroupKind)}><option value="">Choose group type…</option><option>Family</option><option>Friends</option><option>Community</option></select>}
          </Question>
          <Question label="Land" required><ChoiceGroup label="Land" name="landStatus" options={['Own Land', 'Need to Source Land'] as const} value={profile.landStatus} onChange={value => set('landStatus', value as LandStatus)}/></Question>
          <Question label="Property type" required hint={lead.telesales.propertyType === 'Individual House (1 Floor / Villa)' ? 'Telesales recorded “Individual House (1 Floor / Villa)”: confirm independent house or duplex villa.' : undefined}>
            <ChoiceGroup label="Property type" name="propertyType" options={['Independent House', 'Duplex Villa', 'Standalone Apartment', 'Commercial'] as const} value={profile.propertyType} onChange={value => set('propertyType', value as SalesPropertyType)}/>
          </Question>
          {ownLand && <>
            <Question label="Is the plot registered in the customer’s name?" required>
              <ChoiceGroup label="Plot registered" name="plotRegistered" options={YES_NO} value={profile.plotRegistered} onChange={value => set('plotRegistered', value as YesNo)}/>
              {profile.plotRegistered === 'No' && <select className="input max-w-xs" aria-label="Registration status" value={profile.registrationStatus} onChange={event => set('registrationStatus', event.target.value as RegistrationStatus)}><option value="">Choose status…</option><option>Registration to be done</option><option>In process of sourcing</option></select>}
            </Question>
            <Question label="Government approval done?" required><ChoiceGroup label="Government approval" name="govtApproval" options={YES_NO} value={profile.govtApproval} onChange={value => set('govtApproval', value as YesNo)}/></Question>
          </>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer budget" required hint={`Telesales band: ${lead.telesales.budget}`}><input value={profile.budget} onChange={event => set('budget', event.target.value)} placeholder="e.g. ₹2.5 Cr"/></Field>
            <Field label="Plot size" required><input value={profile.plotSize} onChange={event => set('plotSize', event.target.value)} placeholder="e.g. 2,400 sq ft"/></Field>
            <Field label="Dimensions" required={ownLand}><input value={profile.dimensions} onChange={event => set('dimensions', event.target.value)} placeholder="e.g. 40 ft × 60 ft"/></Field>
            <Field label="Approx. built area" required><input value={profile.approxBuiltArea} onChange={event => set('approxBuiltArea', event.target.value)} placeholder="e.g. 3,200 sq ft"/></Field>
          </div>
          <Question label="Type of package" required hint={cost ? `Indicative construction cost: ${formatINR(cost)} (${profile.approxBuiltArea} × ₹${PACKAGE_RATES[profile.packageType as PackageType].toLocaleString('en-IN')} per sq ft)` : 'Rates per sq ft from the website’s Packages page.'}>
            <ChoiceGroup label="Type of package" name="packageType" options={PACKAGES} value={profile.packageType} onChange={value => set('packageType', value)}/>
            <span className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">{PACKAGES.map(item => <span key={item}>{item}: ₹{PACKAGE_RATES[item].toLocaleString('en-IN')}/sq ft</span>)}</span>
          </Question>
          <Question label="Payment plan" required><ChoiceGroup label="Payment plan" name="paymentPlan" options={['Self', 'Loan', '50:50'] as const} value={profile.paymentPlan} onChange={value => set('paymentPlan', value as PaymentPlan)}/></Question>
          <Question label="Decision maker" required><ChoiceGroup label="Decision maker" name="decisionMaker" options={['Self', 'Dependent'] as const} value={profile.decisionMaker} onChange={value => set('decisionMaker', value as DecisionMaker)}/></Question>
          <Question label="Next action" required><ChoiceGroup label="Next action" name="nextAction" options={['Site Visit', 'Follow-up Meeting', 'Follow-up Call', 'Quotation'] as const} value={profile.nextAction} onChange={value => set('nextAction', value as NextAction)}/></Question>
        </div>
        {lead.stage === 'Meeting Scheduled' && <Missing items={missing}/>}
        {editable && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={save}><Save size={15}/> Save details</Button>
          {lead.stage === 'Meeting Scheduled' && <Button onClick={complete}><CheckCircle2 size={15}/> Save and mark meeting done</Button>}
        </div>}
      </fieldset>
    </Card>
  </div>
}
