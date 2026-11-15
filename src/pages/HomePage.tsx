import { AlarmClock, CalendarDays, ChevronRight, Inbox, MapPin, Sparkles, Trees } from 'lucide-react'
import { Link } from 'react-router-dom'
import { QueueBadge, StageBadge, TaskTypeBadge } from '../components/sales'
import { Card, EmptyState, PageHeader, StatCard } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isLandSourcingLead, isNewLead, isOverdueTask, isOverdueVisit, isTodayVisit, STAGES } from '../lib/rules'
import { formatDate, formatTime, now } from '../lib/utils'

export function HomePage() {
  const { user } = useAuth()
  const { leads, state, users } = useData()
  if (!state || !user) return null
  const visible = new Set(leads.map(lead => lead.journeyId))
  const tasks = state.tasks.filter(task => visible.has(task.journeyId))
  const overdueTasks = tasks.filter(task => isOverdueTask(task)).sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const overdueVisits = leads.flatMap(lead => lead.visits.filter(visit => isOverdueVisit(visit)).map(visit => ({ lead, visit })))
  const today = leads.flatMap(lead => lead.visits.filter(visit => isTodayVisit(visit)).map(visit => ({ lead, visit })))
    .sort((a, b) => a.visit.scheduledAt.localeCompare(b.visit.scheduledAt))
  const newLeads = leads.filter(isNewLead)
  const interested = leads.filter(lead => lead.stage === 'Interested')
  const landSourcing = leads.filter(isLandSourcingLead)
  const live = leads.filter(lead => lead.stage !== 'Dead' && lead.stage !== 'Closed')
  const max = Math.max(1, ...STAGES.map(stage => leads.filter(lead => lead.stage === stage).length))
  const ownerName = (id: string) => users.find(item => item.id === id)?.name ?? id
  const greeting = now().getHours() < 12 ? 'Good morning' : now().getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return <>
    <PageHeader eyebrow={`${greeting}, ${user.name.split(' ')[0]}`} title={user.role === 'executive' ? 'Your sales day' : 'Sales overview'}
      description={`${live.length} live journeys · ${formatDate(now().toISOString(), false)}`}
      actions={<Link className="btn btn-primary" to="/calendar"><CalendarDays size={16}/> Open calendar</Link>}/>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Link className="stat-link" to="/leads?view=new"><StatCard label="New leads" value={newLeads.length} detail="Meetings to reconfirm" icon={<Inbox size={20}/>} tone="navy"/></Link>
      <Link className="stat-link" to="/tasks?view=overdue"><StatCard label="Overdue tasks" value={overdueTasks.length + overdueVisits.length} detail="Calls and visits past due" icon={<AlarmClock size={20}/>} tone="red"/></Link>
      <Link className="stat-link" to="/calendar"><StatCard label="Calendar" value={today.length} detail="Meetings and visits today" icon={<CalendarDays size={20}/>} tone="teal"/></Link>
      <Link className="stat-link" to="/leads?view=interested"><StatCard label="Interested" value={interested.length} detail="With the architect" icon={<Sparkles size={20}/>} tone="gold"/></Link>
      <Link className="stat-link" to="/leads?view=land-sourcing"><StatCard label="Land sourcing leads" value={landSourcing.length} detail={`${landSourcing.filter(lead => lead.landSourcing?.status === 'Land Identified').length} with land identified`} icon={<Trees size={20}/>} tone="teal"/></Link>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <Card>
        <div className="section-title"><div><h2>Today’s schedule</h2><p>Meetings and site visits, with location check-in</p></div><Link to="/calendar" className="text-xs font-bold text-teal-700">Calendar</Link></div>
        {today.length === 0 ? <EmptyState title="Nothing scheduled today" description="Upcoming meetings and site visits appear on the calendar."/> : today.map(({ lead, visit }) =>
          <Link key={visit.id} to={`/leads/${lead.journeyId}`} className="metric-row hover:bg-slate-50">
            <div className="w-16 shrink-0 text-sm font-bold text-slate-900">{formatTime(visit.scheduledAt)}</div>
            <div><strong className="block text-sm text-slate-900">{lead.customer.name} · {visit.kind}</strong><span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500"><MapPin size={12}/>{visit.place}</span></div>
            <span className="text-xs font-semibold text-slate-500">{visit.status === 'Completed' ? 'Completed' : visit.arrived ? 'Arrived' : visit.started ? 'On the way' : visit.confirmedAt ? 'Confirmed' : 'Not confirmed'}</span>
            <ChevronRight size={16} className="text-slate-400"/>
          </Link>)}
      </Card>
      <Card>
        <div className="section-title"><div><h2>Pipeline by stage</h2><p>{leads.length} journeys you can see</p></div><Link to="/pipeline" className="text-xs font-bold text-teal-700">Open pipeline</Link></div>
        <div className="space-y-2.5 p-4">
          {STAGES.map(stage => {
            const count = leads.filter(lead => lead.stage === stage).length
            return <Link key={stage} to={`/leads?stage=${encodeURIComponent(stage)}`} className="block rounded-md px-1 py-0.5 hover:bg-slate-50">
              <div className="flex justify-between text-xs"><span className="font-semibold text-slate-700">{stage}</span><span className="font-bold text-slate-900">{count}</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${stage === 'Dead' ? 'bg-slate-300' : stage === 'In Process' ? 'bg-amber-400' : 'bg-teal-500'}`} style={{ width: `${(count / max) * 100}%` }}/></div>
            </Link>
          })}
        </div>
      </Card>
    </div>

    <Card className="mt-5">
      <div className="section-title"><div><h2>Overdue</h2><p>Oldest first</p></div><Link to="/tasks?view=overdue" className="text-xs font-bold text-teal-700">All tasks</Link></div>
      {overdueTasks.length + overdueVisits.length === 0 ? <EmptyState title="Nothing overdue" description="Calls, reconfirmations and visits past their time show here."/> : <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Customer</th><th>What</th><th>Due</th><th>Stage</th><th>Owner</th><th/></tr></thead>
        <tbody>
          {overdueVisits.map(({ lead, visit }) => <tr key={visit.id}><td><strong className="block text-slate-800">{lead.customer.name}</strong><QueueBadge lead={lead}/></td><td>{visit.kind} not checked in</td><td className="font-semibold text-red-600">{formatDate(visit.scheduledAt)}</td><td><StageBadge lead={lead}/></td><td>{ownerName(visit.ownerId)}</td><td><Link to={`/leads/${lead.journeyId}`}>Open</Link></td></tr>)}
          {overdueTasks.slice(0, 8).map(task => { const lead = leads.find(item => item.journeyId === task.journeyId)!; return <tr key={task.id}><td><strong className="block text-slate-800">{lead.customer.name}</strong><span className="text-[10px] text-slate-500">{lead.journeyId}</span></td><td><TaskTypeBadge task={task}/><span className="mt-1 block">{task.title}</span></td><td className="font-semibold text-red-600">{formatDate(task.dueAt)}</td><td><StageBadge lead={lead}/></td><td>{ownerName(task.ownerId)}</td><td><Link to={`/leads/${lead.journeyId}`}>Open</Link></td></tr> })}
        </tbody>
      </table></div>}
    </Card>
  </>
}
