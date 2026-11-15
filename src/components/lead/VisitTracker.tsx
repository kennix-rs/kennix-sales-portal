import { CheckCircle2, Flag, MapPin, Navigation, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { mapLink } from '../../lib/geo'
import { ALLOWANCE_POLICY } from '../../lib/rules'
import { cn, formatDate, formatINR, formatTime } from '../../lib/utils'
import { salesService } from '../../services/salesService'
import type { GeoStamp, SalesLead, Visit } from '../../types'
import { Badge, Button, Field, Modal } from '../ui'

/**
 * Whiteboard: "All Sales meeting leads should automatically pick meeting start location, meeting
 * location arrived and meeting completed location" — used to calculate allowances and to track the team.
 */
export function VisitTracker({ lead, visit, readOnly }: { lead: SalesLead; visit: Visit; readOnly: boolean }) {
  const { user } = useAuth()
  const { state, run, users } = useData()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  if (!user) return null
  const claim = state?.claims.find(item => item.visitId === visit.id)
  const isMine = visit.ownerId === user.id
  const canAct = !readOnly && isMine && visit.status === 'Scheduled'
  const act = async (point: 'start' | 'arrive' | 'complete', message: string) => {
    setBusy(true)
    await run(() => salesService.checkIn(lead.journeyId, visit.id, point, user), message)
    setBusy(false)
  }
  const owner = users.find(item => item.id === visit.ownerId)?.name ?? visit.ownerId
  // Voice notes: Start meeting → Arrived at client location → Meeting completed.
  const site = visit.kind === 'Site Visit'
  const labels = site
    ? { start: 'Start site visit', arrive: 'Arrived at site', complete: 'Site visit completed' }
    : { start: 'Start meeting', arrive: 'Arrived at client location', complete: 'Meeting completed' }

  return <div className="rounded-xl border border-slate-200 bg-white">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{visit.kind}</strong>{visit.fixedBy === 'Telesales' && <Badge tone="blue">T · fixed by Telesales</Badge>}
          <Badge tone={visit.status === 'Completed' ? 'green' : visit.status === 'Cancelled' ? 'slate' : visit.confirmedAt ? 'teal' : 'amber'}>{visit.status === 'Scheduled' ? (visit.confirmedAt ? 'Confirmed' : 'To reconfirm') : visit.status}</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-600">{formatDate(visit.scheduledAt)} · {visit.place}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">Executive: {owner}{visit.confirmedAt ? ` · reconfirmed ${formatDate(visit.confirmedAt)}` : ''}</p>
      </div>
      {canAct && <div className="flex flex-wrap gap-2">
        {!visit.started && <Button size="sm" disabled={busy} onClick={() => act('start', 'Started; location recorded')}><Navigation size={14}/> {labels.start}</Button>}
        {visit.started && !visit.arrived && <Button size="sm" disabled={busy} onClick={() => act('arrive', 'Arrival recorded')}><MapPin size={14}/> {labels.arrive}</Button>}
        {visit.arrived && <Button size="sm" disabled={busy} onClick={() => act('complete', 'Completed; travel claim raised')}><Flag size={14}/> {labels.complete}</Button>}
        {!visit.started && <Button size="sm" variant="ghost" onClick={() => setCancelOpen(true)}><XCircle size={14}/> Cancel</Button>}
      </div>}
    </div>
    <div className="grid gap-2 p-4 sm:grid-cols-3">
      <Stamp label={site ? 'Started for the site' : 'Started for the meeting'} stamp={visit.started}/>
      <Stamp label={labels.arrive} stamp={visit.arrived}/>
      <Stamp label={labels.complete} stamp={visit.completed}/>
    </div>
    {!isMine && visit.status === 'Scheduled' && !readOnly && <p className="px-4 pb-3 text-[11px] text-slate-500">Only {owner} can check in to this visit.</p>}
    {claim && <div className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
      <span className="text-slate-600">Travel allowance: {claim.oneWayKm} km one way → {claim.claimKm} km{ALLOWANCE_POLICY.returnTrip ? ' (return)' : ''} × ₹{ALLOWANCE_POLICY.ratePerKm}</span>
      <span className="flex items-center gap-2"><strong className="text-slate-900">{formatINR(claim.amount)}</strong><Badge tone={claim.status === 'Approved' ? 'green' : claim.status === 'Rejected' ? 'red' : 'amber'}>{claim.status}</Badge></span>
    </div>}
    <Modal open={cancelOpen} onOpenChange={setCancelOpen} title={`Cancel ${visit.kind.toLowerCase()}`} description="To move it to another time, log a call with the outcome “Rescheduled” instead."
      footer={<><Button variant="secondary" onClick={() => setCancelOpen(false)}>Keep it</Button><Button variant="danger" onClick={async () => { if (await run(() => salesService.cancelVisit(lead.journeyId, visit.id, reason, user), 'Visit cancelled')) { setCancelOpen(false); setReason('') } }}>Cancel visit</Button></>}>
      <Field label="Reason" required><textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Why is the visit cancelled?"/></Field>
    </Modal>
  </div>
}

function Stamp({ label, stamp }: { label: string; stamp?: GeoStamp }) {
  return <div className={cn('track-step', stamp && 'done')}>
    {stamp ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-600"/> : <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300"/>}
    <div className="min-w-0">
      <strong className="block text-[11px] text-slate-800">{label}</strong>
      {stamp ? <>
        <span className="block text-[11px] text-slate-600">{formatTime(stamp.at)} · <a className="font-semibold text-teal-700" href={mapLink(stamp)} target="_blank" rel="noreferrer">{stamp.lat.toFixed(4)}, {stamp.lng.toFixed(4)}</a></span>
        {stamp.simulated && <span className="text-[10px] text-slate-400">Simulated in preview</span>}
      </> : <span className="block text-[11px] text-slate-400">Not yet</span>}
    </div>
  </div>
}
