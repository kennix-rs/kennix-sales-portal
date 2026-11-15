import { CheckCircle2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { StageBadge, TaskTypeBadge } from '../components/sales'
import { Button, Card, EmptyState, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isOverdueTask, isOverdueVisit } from '../lib/rules'
import { formatDate, now, sameDay } from '../lib/utils'
import { salesService } from '../services/salesService'

const VIEWS = ['overdue', 'today', 'upcoming'] as const

export function TasksPage() {
  const { user } = useAuth()
  const { leads, state, users, run } = useData()
  const [params, setParams] = useSearchParams()
  const view = (VIEWS as readonly string[]).includes(params.get('view') ?? '') ? params.get('view') as typeof VIEWS[number] : 'overdue'
  if (!state || !user) return null
  const byId = new Map(leads.map(lead => [lead.journeyId, lead]))
  const open = state.tasks.filter(task => task.status === 'Open' && byId.has(task.journeyId)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const groups = {
    overdue: open.filter(task => isOverdueTask(task)),
    today: open.filter(task => !isOverdueTask(task) && sameDay(new Date(task.dueAt), now())),
    upcoming: open.filter(task => new Date(task.dueAt) > now() && !sameDay(new Date(task.dueAt), now())),
  }
  const missedVisits = leads.flatMap(lead => lead.visits.filter(visit => isOverdueVisit(visit)).map(visit => ({ lead, visit })))
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id
  const rows = groups[view]

  return <>
    <PageHeader eyebrow="Work queue" title="Tasks" description="Reconfirmations, call-backs, architect and handover calls. Logging a call closes the call tasks for that journey."/>
    <div className="tabs-list mb-4" role="tablist" aria-label="Task views">
      {VIEWS.map(item => <button key={item} role="tab" aria-selected={view === item} data-state={view === item ? 'active' : 'inactive'} className="tab-trigger capitalize" onClick={() => setParams({ view: item }, { replace: true })}>
        {item} <span className={`ml-1 rounded-full px-1.5 text-[10px] ${item === 'overdue' && groups.overdue.length ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{groups[item].length + (item === 'overdue' ? missedVisits.length : 0)}</span>
      </button>)}
    </div>
    {view === 'overdue' && missedVisits.length > 0 && <Card className="mb-4 border-red-200">
      <div className="section-title"><div><h2>Visits not checked in</h2><p>Past their time and still scheduled: complete, reschedule or cancel them</p></div></div>
      {missedVisits.map(({ lead, visit }) => <Link key={visit.id} to={`/leads/${lead.journeyId}`} className="metric-row hover:bg-slate-50"><div><strong className="block text-xs text-slate-900">{lead.customer.name} · {visit.kind}</strong><span className="text-[11px] text-red-600">{formatDate(visit.scheduledAt)}</span></div><StageBadge lead={lead}/></Link>)}
    </Card>}
    <Card>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Task</th><th>Customer</th><th>Due</th><th>Stage</th><th>Owner</th><th/></tr></thead>
        <tbody>{rows.map(task => {
          const lead = byId.get(task.journeyId)!
          return <tr key={task.id}>
            <td><TaskTypeBadge task={task}/><span className="mt-1 block font-semibold text-slate-800">{task.title}</span></td>
            <td><Link to={`/leads/${lead.journeyId}`}>{lead.customer.name}</Link><span className="block text-[10px] text-slate-500">{lead.customer.mobile}</span></td>
            <td className={isOverdueTask(task) ? 'font-semibold text-red-600' : ''}>{formatDate(task.dueAt)}</td>
            <td><StageBadge lead={lead}/></td>
            <td>{ownerName(task.ownerId)}</td>
            <td>{task.ownerId === user.id && <Button size="sm" variant="secondary" onClick={() => run(() => salesService.completeTask(task.id, user), 'Task marked done')}><CheckCircle2 size={14}/> Done</Button>}</td>
          </tr>
        })}</tbody>
      </table></div>
      {rows.length === 0 && <EmptyState title={`No ${view} tasks`} description="New tasks come from calls, meetings and quotations."/>}
    </Card>
  </>
}
