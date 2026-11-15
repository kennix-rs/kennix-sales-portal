import { Check, Clock3, Route, Wallet, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, StatCard } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { mapLink } from '../lib/geo'
import { ALLOWANCE_POLICY, visibleOwnerIds } from '../lib/rules'
import { canManage, formatDate, formatINR } from '../lib/utils'
import { salesService } from '../services/salesService'
import type { ClaimStatus } from '../types'

const STATUSES: (ClaimStatus | 'All')[] = ['All', 'Pending Approval', 'Approved', 'Rejected']

/** Whiteboard: visit locations "auto calculate their allowances" and "help in tracking the Sales team". */
export function TravelPage() {
  const { user } = useAuth()
  const { state, users, run } = useData()
  const [params, setParams] = useSearchParams()
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [note, setNote] = useState('')
  if (!state || !user) return null
  const status = (STATUSES as string[]).includes(params.get('status') ?? '') ? params.get('status') as ClaimStatus : 'All'
  const owners = visibleOwnerIds(user, users)
  const mine = state.claims.filter(claim => owners.has(claim.ownerId)).sort((a, b) => b.date.localeCompare(a.date))
  const rows = mine.filter(claim => status === 'All' || claim.status === status)
  const sum = (list: typeof mine) => list.reduce((total, claim) => total + claim.amount, 0)
  const lead = (journeyId: string) => state.leads.find(item => item.journeyId === journeyId)
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id

  return <>
    <PageHeader eyebrow="Allowances" title="Travel reimbursement" description="Each completed meeting or site visit raises a claim from the trip’s start and arrival locations. Team Leads and Managers approve their team’s claims."/>
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Awaiting approval" value={formatINR(sum(mine.filter(claim => claim.status === 'Pending Approval')))} detail={`${mine.filter(claim => claim.status === 'Pending Approval').length} claims`} icon={<Clock3 size={20}/>} tone="gold"/>
      <StatCard label="Approved" value={formatINR(sum(mine.filter(claim => claim.status === 'Approved')))} detail={`${mine.filter(claim => claim.status === 'Approved').length} claims`} icon={<Wallet size={20}/>} tone="teal"/>
      <StatCard label="Distance claimed" value={`${Math.round(mine.reduce((total, claim) => total + claim.claimKm, 0))} km`} detail={`${mine.length} trips`} icon={<Route size={20}/>} tone="navy"/>
    </div>
    <Card className="mt-5 p-4 text-xs leading-5 text-slate-600">
      <strong className="text-slate-900">Preview policy (to be confirmed):</strong> road distance ≈ {ALLOWANCE_POLICY.roadFactor} × the straight line from trip start to arrival, {ALLOWANCE_POLICY.returnTrip ? 'doubled for the return trip, ' : ''}at ₹{ALLOWANCE_POLICY.ratePerKm} per km. Locations are simulated in the preview; the live app uses the phone’s GPS.
    </Card>
    <div className="tabs-list mt-5 mb-4" role="tablist" aria-label="Claim status">
      {STATUSES.map(item => <button key={item} role="tab" aria-selected={status === item} data-state={status === item ? 'active' : 'inactive'} className="tab-trigger" onClick={() => setParams(item === 'All' ? {} : { status: item }, { replace: true })}>{item}</button>)}
    </div>
    <Card>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Date</th><th>Executive</th><th>Customer · visit</th><th>Route</th><th>Distance</th><th>Amount</th><th>Status</th><th/></tr></thead>
        <tbody>{rows.map(claim => {
          const journey = lead(claim.journeyId)
          const visit = journey?.visits.find(item => item.id === claim.visitId)
          return <tr key={claim.id}>
            <td>{formatDate(claim.date, false)}</td>
            <td>{ownerName(claim.ownerId)}</td>
            <td>{journey ? <Link to={`/leads/${journey.journeyId}`}>{journey.customer.name}</Link> : claim.journeyId}<span className="block text-[10px] text-slate-500">{visit?.kind}</span></td>
            <td className="text-[11px]">{visit?.started && <a className="!font-semibold" href={mapLink(visit.started)} target="_blank" rel="noreferrer">Start</a>} → {visit?.arrived && <a className="!font-semibold" href={mapLink(visit.arrived)} target="_blank" rel="noreferrer">Arrived</a>}</td>
            <td>{claim.oneWayKm} km × {ALLOWANCE_POLICY.returnTrip ? 2 : 1} = <strong>{claim.claimKm} km</strong></td>
            <td className="font-bold text-slate-900">{formatINR(claim.amount)}</td>
            <td><Badge tone={claim.status === 'Approved' ? 'green' : claim.status === 'Rejected' ? 'red' : 'amber'}>{claim.status}</Badge>{claim.decidedBy && <span className="mt-0.5 block text-[10px] text-slate-500">{claim.decidedBy}{claim.note ? `: ${claim.note}` : ''}</span>}</td>
            <td>{canManage(user.role) && claim.status === 'Pending Approval' && claim.ownerId !== user.id && <div className="flex gap-1">
              <Button size="sm" onClick={() => run(() => salesService.decideClaim(claim.id, true, '', user), 'Claim approved')}><Check size={14}/> Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => { setNote(''); setRejecting(claim.id) }} aria-label="Reject claim"><X size={14}/></Button>
            </div>}</td>
          </tr>
        })}</tbody>
      </table></div>
      {rows.length === 0 && <EmptyState title="No claims" description="Claims appear when a meeting or site visit is completed with location check-in."/>}
    </Card>
    <Modal open={!!rejecting} onOpenChange={open => !open && setRejecting(null)} title="Reject travel claim"
      footer={<><Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" onClick={async () => { if (rejecting && await run(() => salesService.decideClaim(rejecting, false, note, user), 'Claim rejected')) setRejecting(null) }}>Reject</Button></>}>
      <Field label="Reason" required><textarea value={note} onChange={event => setNote(event.target.value)}/></Field>
    </Modal>
  </>
}
