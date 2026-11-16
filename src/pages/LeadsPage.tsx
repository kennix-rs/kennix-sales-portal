import { ArrowLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PriorityBadge, QueueBadge, StageBadge } from '../components/sales'
import { Card, EmptyState, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isLandSourcingLead, isNewLead, isSalesRejected, nextScheduledVisit, STAGES } from '../lib/rules'
import { canManage, cn, formatDate } from '../lib/utils'
import type { SalesLead, SalesStage } from '../types'

/** Tabs: the two intake queues from Telesales (DOMAIN.md §8), plus everything. */
const VIEWS = [
  { key: 'all', label: 'All journeys', test: () => true },
  { key: 'new', label: 'New leads', test: isNewLead },
  { key: 'land-sourcing', label: 'Land sourcing leads', test: isLandSourcingLead },
  { key: 'interested', label: 'Interested', test: (lead: SalesLead) => lead.stage === 'Interested' },
  { key: 'rejected', label: 'Sent back to Telesales', test: isSalesRejected },
] as const

export function LeadsPage() {
  const { user } = useAuth()
  const { leads, users } = useData()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // Back to the page you came from (a Home tile, the pipeline…); Home when the list was opened directly.
  const goBack = () => (location.key === 'default' ? navigate('/home') : navigate(-1))
  const view = VIEWS.find(item => item.key === params.get('view')) ?? VIEWS[0]
  const stage = (STAGES as string[]).includes(params.get('stage') ?? '') ? params.get('stage') as SalesStage : 'All'
  const owner = params.get('owner') ?? 'All'
  const search = params.get('search') ?? ''
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (!value || value === 'All' || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const query = search.trim().toLowerCase()
  const rows = leads.filter(lead =>
    view.test(lead)
    && (stage === 'All' || lead.stage === stage)
    && (owner === 'All' || lead.ownerId === owner)
    && (!query || [lead.journeyId, lead.reference, lead.customer.name, lead.customer.mobile, lead.customer.city, lead.customer.location].some(value => value.toLowerCase().includes(query))))
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id
  const team = users.filter(item => leads.some(lead => lead.ownerId === item.id))

  return <>
    <button type="button" onClick={goBack} className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800"><ArrowLeft size={14}/> Back</button>
    <PageHeader eyebrow="From Telesales" title="Leads" description="Journeys Telesales qualified with a Sales meeting fixed. Land sourcing leads also went to the Land Sourcing team, which shares the land once identified."/>
    <div className="tabs-list mb-4" role="tablist" aria-label="Lead views">
      {VIEWS.map(item => <button key={item.key} role="tab" aria-selected={item.key === view.key} data-state={item.key === view.key ? 'active' : 'inactive'} className="tab-trigger" onClick={() => set('view', item.key)}>
        {item.label} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600">{leads.filter(lead => item.test(lead)).length}</span>
      </button>)}
    </div>
    <Card className="mb-4 p-4">
      <div className={cn('grid gap-3', canManage(user!.role) ? 'md:grid-cols-[1fr_220px_220px]' : 'md:grid-cols-[1fr_220px]')}>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/><input className="input pl-9!" value={search} onChange={event => set('search', event.target.value)} placeholder="Search customer, Journey ID, mobile, city…" aria-label="Search leads"/></div>
        <select className="input" aria-label="Stage" value={stage} onChange={event => set('stage', event.target.value)}><option value="All">All stages</option>{STAGES.map(item => <option key={item}>{item}</option>)}</select>
        {canManage(user!.role) && <select className="input" aria-label="Owner" value={owner} onChange={event => set('owner', event.target.value)}><option value="All">Everyone</option>{team.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}
      </div>
    </Card>
    <Card>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Customer</th><th>Journey</th><th>Land</th><th>Stage</th><th>Next visit</th><th>Owner</th><th>Priority</th><th/></tr></thead>
        <tbody>{rows.map(lead => {
          const visit = nextScheduledVisit(lead)
          return <tr key={lead.journeyId}>
            <td><strong className="block text-slate-800">{lead.customer.name}</strong><span className="text-[10px] text-slate-500">{lead.customer.mobile} · {lead.customer.city}</span></td>
            <td><Link to={`/leads/${lead.journeyId}`}>{lead.journeyId}</Link><span className="mt-0.5 block text-[10px] text-slate-500">{lead.reference}</span></td>
            <td><QueueBadge lead={lead}/></td>
            <td><StageBadge lead={lead}/></td>
            <td>{lead.returnedToTelesales ? <span className="text-[11px] text-red-700">{lead.returnedToTelesales.attempts ? `${lead.returnedToTelesales.attempts} attempts unanswered` : 'Not interested before the meeting'}</span> : visit ? <><span className="block font-semibold text-slate-800">{formatDate(visit.scheduledAt)}</span><span className="text-[10px] text-slate-500">{visit.kind}{visit.confirmedAt ? ' · confirmed' : ' · to reconfirm'}</span></> : <span className="text-slate-400">—</span>}</td>
            <td>{ownerName(lead.ownerId)}</td>
            <td><PriorityBadge priority={lead.priority}/></td>
            <td><Link to={`/leads/${lead.journeyId}`} className="btn btn-ghost btn-icon" aria-label={`Open ${lead.customer.name}`}><ChevronRight size={16}/></Link></td>
          </tr>
        })}</tbody>
      </table></div>
      {rows.length === 0 && <EmptyState title="No matching journeys" description="Change the tab, stage or search to see more."/>}
    </Card>
  </>
}
