import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft, Lock, MessageSquarePlus, Phone, Skull, Undo2, UserRoundCog } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { DealTab } from '../components/lead/DealTab'
import { LogCallDialog } from '../components/lead/LogCallDialog'
import { MeetingTab } from '../components/lead/MeetingTab'
import { SiteVisitTab } from '../components/lead/SiteVisitTab'
import { Fact, PriorityBadge, QueueBadge, StageBadge, StageStrip } from '../components/sales'
import { Badge, Button, Card, Field, Modal } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isReadOnly, nextScheduledVisit, recentInProcessAttempts, RETURN_RULE, visibleOwnerIds, visitHappened } from '../lib/rules'
import { canManage, formatDate } from '../lib/utils'
import { salesService } from '../services/salesService'
import type { SalesLead } from '../types'

function defaultTab(lead: SalesLead) {
  if (['SV Scheduled', 'SV Done'].includes(lead.stage)) return 'site-visit'
  if (['Interested', 'Under Negotiation', 'Closed'].includes(lead.stage)) return 'deal'
  if (lead.stage === 'Dead' || lead.stage === 'Sales Rejected') return 'overview'
  return 'meeting'
}

export function LeadDetailPage() {
  const { journeyId } = useParams()
  const { user } = useAuth()
  const { leads, state, users, run } = useData()
  const [callOpen, setCallOpen] = useState(false)
  const [deadOpen, setDeadOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [text, setText] = useState('')
  const [owner, setOwner] = useState('')
  const lead = leads.find(item => item.journeyId === journeyId)
  if (!state || !user) return null
  if (!lead) return <Navigate to="/leads" replace/>
  const readOnly = isReadOnly(lead)
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id
  const visit = nextScheduledVisit(lead)
  const team = users.filter(item => visibleOwnerIds(user, users).has(item.id) && item.id !== lead.ownerId)
  // Voice notes: before any meeting or site visit a dropped customer goes back to Telesales; Dead is only after one.
  const canDie = visitHappened(lead)

  return <>
    <Link to="/leads" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"><ArrowLeft size={14}/> Leads</Link>
    <Card className="mb-5 overflow-hidden">
      <div className="bg-gradient-to-r from-[#10243e] to-[#17395f] p-5 text-white sm:p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <div className="flex flex-wrap gap-2"><Badge tone="teal">{lead.reference}</Badge><StageBadge lead={lead}/><QueueBadge lead={lead}/><PriorityBadge priority={lead.priority}/></div>
            <h1 className="mt-3 text-2xl font-bold">{lead.customer.name}</h1>
            <p className="mt-1 text-sm text-slate-300">{lead.journeyId} · {lead.customer.mobile} · {lead.customer.location}, {lead.customer.city}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!readOnly && <Button onClick={() => setCallOpen(true)}><Phone size={15}/> Log call</Button>}
            {!readOnly && canManage(user.role) && <Button variant="secondary" onClick={() => { setOwner(team[0]?.id ?? ''); setReassignOpen(true) }}><UserRoundCog size={15}/> Reassign</Button>}
            {!readOnly && <Button variant="secondary" onClick={() => setDeadOpen(true)}>{canDie ? <><Skull size={15}/> Mark dead</> : <><Undo2 size={15}/> Return to Telesales</>}</Button>}
          </div>
        </div>
        <dl className="mt-5 grid gap-4 border-t border-white/10 pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4 [&_dd]:text-white [&_dt]:text-slate-400">
          <Fact label="Owner" value={ownerName(lead.ownerId)}/>
          <Fact label="Next" value={visit ? `${visit.kind} · ${formatDate(visit.scheduledAt)}` : '—'}/>
          <Fact label="Received from Telesales" value={`${formatDate(lead.receivedAt, false)} · ${lead.telesales.owner}`}/>
          <Fact label="Land" value={lead.queue === 'New Leads' ? 'Own land' : `${lead.landSourcing?.reference} · ${lead.landSourcing?.status}`}/>
        </dl>
      </div>
      <div className="p-4"><StageStrip lead={lead}/>
        {lead.stage === 'In Process' && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><strong>In Process · {lead.inProcessReason}.</strong> Returns to {lead.resumeStage} when the customer is reached. Attempts in the last {RETURN_RULE.withinHours / 24} days: {recentInProcessAttempts(lead)} of {RETURN_RULE.attempts}; at {RETURN_RULE.attempts} the journey goes back to Telesales.</p>}
        {lead.stage === 'Sales Rejected' && lead.returnedToTelesales && <p className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800"><strong>Sent back to Telesales (Sales rejected)</strong> on {formatDate(lead.returnedToTelesales.at)} by {lead.returnedToTelesales.by}{lead.returnedToTelesales.attempts ? ` after ${lead.returnedToTelesales.attempts} attempts without reaching the customer` : ''}: “{lead.returnedToTelesales.reason.replace(/[.\s]+$/, '')}”. Read-only in Sales.</p>}
        {readOnly && lead.stage !== 'Sales Rejected' && <p className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><Lock size={14}/>{lead.stage === 'Closed' ? 'Closed and handed over to Architecture.' : `Dead: ${lead.deadReason}`} This journey is read-only.</p>}
      </div>
    </Card>

    <Tabs.Root defaultValue={defaultTab(lead)} key={lead.journeyId}>
      <Tabs.List className="tabs-list" aria-label="Journey sections">
        <Tabs.Trigger className="tab-trigger" value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="meeting">Meeting</Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="site-visit">Site visit</Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="deal">Architecture & closing</Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="feedback">Feedback & calls ({lead.feedback.length})</Tabs.Trigger>
        <Tabs.Trigger className="tab-trigger" value="activity">Activity</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="overview" className="tab-content"><Overview lead={lead}/></Tabs.Content>
      <Tabs.Content value="meeting" className="tab-content"><MeetingTab key={`${lead.journeyId}-${lead.stage}`} lead={lead} readOnly={readOnly}/></Tabs.Content>
      <Tabs.Content value="site-visit" className="tab-content"><SiteVisitTab key={`${lead.journeyId}-${lead.stage}`} lead={lead} readOnly={readOnly}/></Tabs.Content>
      <Tabs.Content value="deal" className="tab-content"><DealTab key={`${lead.journeyId}-${lead.stage}`} lead={lead} readOnly={readOnly}/></Tabs.Content>
      <Tabs.Content value="feedback" className="tab-content">
        <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
          <Card>
            <div className="section-title"><div><h2>Feedback thread</h2><p>One thread from Telesales onwards, oldest first</p></div></div>
            <div className="timeline p-5">{lead.feedback.map(entry => <div key={entry.id} className="timeline-item">
              <div className="flex flex-wrap items-center gap-2 text-[11px]"><strong className="text-slate-800">{entry.author}</strong><Badge tone={entry.team === 'Telesales' ? 'blue' : entry.team === 'Sales' ? 'teal' : 'violet'}>{entry.team}</Badge>{entry.outcome && <Badge tone="slate">{entry.outcome}</Badge>}<span className="text-slate-400">{formatDate(entry.createdAt)}</span></div>
              <p className="mt-1 text-sm text-slate-700">{entry.text}</p>
            </div>)}</div>
            {!readOnly && <div className="border-t border-slate-100 p-4">
              <Field label="Add a comment"><textarea value={text} onChange={event => setText(event.target.value)} placeholder="Notes for the team (calls are added automatically)"/></Field>
              <Button className="mt-3" variant="secondary" onClick={async () => { if (await run(() => salesService.addFeedback(lead.journeyId, text, user), 'Comment added')) setText('') }}><MessageSquarePlus size={15}/> Add comment</Button>
            </div>}
          </Card>
          <Card>
            <div className="section-title"><div><h2>Sales calls</h2><p>{lead.calls.length} logged</p></div></div>
            {lead.calls.length === 0 ? <p className="p-5 text-xs text-slate-500">No Sales calls yet. Start by reconfirming the meeting.</p> : lead.calls.map(call => <div key={call.id} className="metric-row">
              <Phone size={15} className="text-slate-400"/><div><div className="flex flex-wrap items-center gap-2"><Badge tone={['RNR', 'Switch Off', 'Call Back Later'].includes(call.outcome) ? 'amber' : call.outcome === 'Not Interested' ? 'red' : 'teal'}>{call.outcome}</Badge><span className="text-[11px] text-slate-400">{formatDate(call.at)} · {call.employee}</span></div><p className="mt-1 text-xs text-slate-600">{call.notes}</p></div>
            </div>)}
          </Card>
        </div>
      </Tabs.Content>
      <Tabs.Content value="activity" className="tab-content">
        <Card><div className="timeline p-5">{lead.activities.map(item => <div key={item.id} className="timeline-item"><strong className="text-xs text-slate-900">{item.type}</strong><p className="mt-0.5 text-xs text-slate-600">{item.description}</p><span className="text-[10px] text-slate-400">{item.actor} · {formatDate(item.createdAt)}</span></div>)}</div></Card>
      </Tabs.Content>
    </Tabs.Root>

    {callOpen && <LogCallDialog lead={lead} open={callOpen} onOpenChange={setCallOpen}/>}
    <Modal open={deadOpen} onOpenChange={setDeadOpen} title={canDie ? 'Mark journey dead' : 'Return to Telesales'}
      description={canDie ? 'Dead journeys become read-only in Sales.' : 'No meeting or site visit has happened, so the journey goes back to Telesales as “Sales rejected”. Telesales sees your comment.'}
      footer={<><Button variant="secondary" onClick={() => setDeadOpen(false)}>Cancel</Button><Button variant="danger" onClick={async () => {
        const ok = canDie ? await run(() => salesService.markDead(lead.journeyId, text, user), 'Journey marked dead') : await run(() => salesService.returnToTelesales(lead.journeyId, text, user), 'Sent back to Telesales')
        if (ok) { setDeadOpen(false); setText('') }
      }}>{canDie ? 'Mark dead' : 'Return to Telesales'}</Button></>}>
      <Field label={canDie ? 'Reason' : 'Comment for Telesales'} required><textarea value={text} onChange={event => setText(event.target.value)} placeholder={canDie ? 'Why is the customer not going ahead?' : 'Why is Sales sending this lead back?'}/></Field>
    </Modal>
    <Modal open={reassignOpen} onOpenChange={setReassignOpen} title="Reassign journey" description="Open tasks and visits that haven't started move to the new owner."
      footer={<><Button variant="secondary" onClick={() => setReassignOpen(false)}>Cancel</Button><Button onClick={async () => { if (await run(() => salesService.reassign(lead.journeyId, owner, text, user), 'Journey reassigned')) { setReassignOpen(false); setText('') } }}>Reassign</Button></>}>
      <div className="grid gap-3">
        <Field label="New owner" required><select value={owner} onChange={event => setOwner(event.target.value)}>{team.map(item => <option key={item.id} value={item.id}>{item.name} · {item.title}</option>)}</select></Field>
        <Field label="Reason" required><textarea value={text} onChange={event => setText(event.target.value)}/></Field>
      </div>
    </Modal>
  </>
}

function Overview({ lead }: { lead: SalesLead }) {
  const t = lead.telesales
  return <div className="grid gap-5 lg:grid-cols-2">
    <Card className="p-5">
      <h2 className="text-sm font-bold text-slate-900">Telesales brief</h2>
      <p className="mt-1 text-xs text-slate-500">Captured by {t.owner}; sent {formatDate(t.sentAt)}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Fact label="Customer type" value={t.customerType}/><Fact label="Property type" value={t.propertyType}/>
        <Fact label="Requirement" value={t.requirement}/><Fact label="Budget" value={t.budget}/>
        <Fact label="Size" value={t.size}/><Fact label="Timeline" value={t.timeline}/>
        <Fact label="Land status" value={t.landStatus}/><Fact label="Preferred location" value={t.locations.map(item => `${item.name} (${item.pincode})`).join(', ')}/>
      </dl>
    </Card>
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900">Customer</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Fact label="Mobile" value={lead.customer.mobile}/><Fact label="Alternate number" value={lead.customer.alternateMobile}/>
          <Fact label="Email" value={lead.customer.email}/><Fact label="Address" value={`${lead.customer.location}, ${lead.customer.city}, ${lead.customer.state} ${lead.customer.pincode}`}/>
        </dl>
      </Card>
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900">Land</h2>
        {lead.queue === 'New Leads' ? <p className="mt-2 text-xs text-slate-600">The customer owns the land. Verify it on the site visit.</p> : <>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Fact label="Land Sourcing reference" value={lead.landSourcing?.reference}/><Fact label="Status" value={<Badge tone={lead.landSourcing?.status === 'Land Identified' ? 'green' : 'violet'}>{lead.landSourcing?.status}</Badge>}/>
            <Fact label="Submitted" value={formatDate(lead.landSourcing?.submittedAt)}/><Fact label="Identified" value={lead.landSourcing?.completedAt ? formatDate(lead.landSourcing.completedAt) : 'Not yet'}/>
          </dl>
          {lead.landSourcing?.selectedOption && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">
            <strong className="block">{lead.landSourcing.selectedOption.title}</strong>
            <span className="mt-1 block">{lead.landSourcing.selectedOption.location} · {lead.landSourcing.selectedOption.area} · asking {lead.landSourcing.selectedOption.askingPrice}</span>
          </div>}
          <p className="mt-3 text-[11px] text-slate-500">Land Sourcing works from the requirement only and updates Sales when land is identified.</p>
        </>}
      </Card>
    </div>
  </div>
}
