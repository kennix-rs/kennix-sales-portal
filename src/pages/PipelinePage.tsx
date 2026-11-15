import { Link } from 'react-router-dom'
import { PriorityBadge, QueueBadge } from '../components/sales'
import { Badge, PageHeader } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { IN_PROCESS_REASONS, nextScheduledVisit, STAGES } from '../lib/rules'
import { formatDate, stageTone } from '../lib/utils'

/** Whiteboard "Pipeline by stage": one column per stage; In Process shows its sub-dispositions. */
export function PipelinePage() {
  const { leads, users } = useData()
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id
  return <>
    <PageHeader eyebrow="Pipeline" title="Pipeline by stage" description="In Process holds journeys where the customer couldn't be reached (Switch Off, RNR, Call Back Later); they return to their stage once reached."/>
    <div className="kanban">
      {STAGES.map(stage => {
        const items = leads.filter(lead => lead.stage === stage)
        return <section key={stage} className="kanban-col" aria-label={stage}>
          <header><strong>{stage}</strong><Badge tone={stageTone(stage)}>{items.length}</Badge></header>
          {stage === 'In Process' && <div className="flex flex-wrap gap-1 px-3 pt-2">{IN_PROCESS_REASONS.map(reason => <Badge key={reason} tone="amber">{reason}: {items.filter(lead => lead.inProcessReason === reason).length}</Badge>)}</div>}
          {items.map(lead => {
            const visit = nextScheduledVisit(lead)
            return <Link key={lead.journeyId} to={`/leads/${lead.journeyId}`} className="kanban-card">
              <div className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-900">{lead.customer.name}</strong><PriorityBadge priority={lead.priority}/></div>
              <p className="mt-1 text-[11px] text-slate-500">{lead.journeyId} · {lead.customer.city}</p>
              <div className="mt-2 flex flex-wrap gap-1"><QueueBadge lead={lead}/>{lead.inProcessReason && <Badge tone="amber">{lead.inProcessReason}</Badge>}</div>
              <p className="mt-2 text-[11px] text-slate-600">{visit ? `${visit.kind}: ${formatDate(visit.scheduledAt)}` : lead.architecture?.quotation ? `Quotation ₹${lead.architecture.quotation.amount.toLocaleString('en-IN')}` : lead.deadReason ?? '—'}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">{ownerName(lead.ownerId)}</p>
            </Link>
          })}
          {items.length === 0 && <p className="p-4 text-center text-[11px] text-slate-400">No journeys</p>}
        </section>
      })}
    </div>
  </>
}
