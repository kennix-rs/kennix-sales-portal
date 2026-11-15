import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TaskTypeBadge } from '../components/sales'
import { Badge, Button, Card, EmptyState, PageHeader } from '../components/ui'
import { useData } from '../contexts/DataContext'
import { cn, formatTime, now, sameDay } from '../lib/utils'
import type { SalesLead, Task, Visit } from '../types'

type Entry = { at: string; lead: SalesLead } & ({ kind: 'visit'; visit: Visit } | { kind: 'task'; task: Task })
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Meetings land here as soon as Telesales hands a journey over (whiteboard: "Lead will reflect in Calendar"). */
export function CalendarPage() {
  const { leads, state } = useData()
  const [month, setMonth] = useState(() => new Date(now().getFullYear(), now().getMonth(), 1))
  const [selected, setSelected] = useState(() => now())
  if (!state) return null
  const visible = new Map(leads.map(lead => [lead.journeyId, lead]))
  const entries: Entry[] = [
    ...leads.flatMap(lead => lead.visits.filter(visit => visit.status !== 'Cancelled').map(visit => ({ kind: 'visit' as const, at: visit.scheduledAt, lead, visit }))),
    ...state.tasks.filter(task => task.status === 'Open' && visible.has(task.journeyId)).map(task => ({ kind: 'task' as const, at: task.dueAt, lead: visible.get(task.journeyId)!, task })),
  ].sort((a, b) => a.at.localeCompare(b.at))
  const first = new Date(month)
  const offset = (first.getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1))
  const on = (day: Date) => entries.filter(entry => sameDay(new Date(entry.at), day))
  const agenda = on(selected)
  const label = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(month)
  const move = (delta: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + delta, 1))

  return <>
    <PageHeader eyebrow="Schedule" title="Calendar" description="Sales meetings, site visits and follow-up tasks for the journeys you can see."
      actions={<div className="flex items-center gap-2"><Button variant="secondary" size="icon" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={16}/></Button><strong className="min-w-36 text-center text-sm">{label}</strong><Button variant="secondary" size="icon" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={16}/></Button><Button variant="secondary" onClick={() => { setMonth(new Date(now().getFullYear(), now().getMonth(), 1)); setSelected(now()) }}>Today</Button></div>}/>
    <div className="grid gap-5 xl:grid-cols-[1.5fr_.5fr]">
      <Card className="overflow-hidden">
        <div className="table-wrap"><div className="calendar-grid min-w-[720px]">
          {WEEKDAYS.map(day => <div key={day} className="calendar-head">{day}</div>)}
          {days.map(day => {
            const items = on(day)
            const muted = day.getMonth() !== month.getMonth()
            return <button key={day.toISOString()} type="button" onClick={() => setSelected(day)} className={cn('calendar-cell text-left', muted && 'muted', sameDay(day, now()) && 'today', sameDay(day, selected) && 'bg-teal-50/50')} aria-label={`${day.toDateString()}, ${items.length} items`}>
              <span className="text-xs font-bold">{day.getDate()}</span>
              {items.slice(0, 3).map(entry => <span key={entry.kind === 'visit' ? entry.visit.id : entry.task.id} className={cn('calendar-event', entry.kind === 'visit' ? (entry.visit.kind === 'Site Visit' ? 'bg-violet-100 text-violet-800' : 'bg-teal-100 text-teal-800') : 'bg-amber-100 text-amber-900')}>
                {formatTime(entry.at)} {entry.lead.customer.name.split(' ')[0]}
              </span>)}
              {items.length > 3 && <span className="mt-1 block text-[10px] font-semibold text-slate-500">+{items.length - 3} more</span>}
            </button>
          })}
        </div></div>
        <div className="flex flex-wrap gap-3 border-t border-slate-100 px-4 py-3 text-[11px] text-slate-600"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-teal-200"/>Meeting</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-violet-200"/>Site visit</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-amber-200"/>Task</span></div>
      </Card>
      <Card>
        <div className="section-title"><div><h2>{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).format(selected)}</h2><p>{agenda.length} items</p></div></div>
        {agenda.length === 0 ? <EmptyState title="Free day" description="Pick another date to see its meetings and tasks."/> : agenda.map(entry => <Link key={entry.kind === 'visit' ? entry.visit.id : entry.task.id} to={`/leads/${entry.lead.journeyId}`} className="metric-row hover:bg-slate-50">
          <div className="w-14 shrink-0 text-xs font-bold text-slate-900">{formatTime(entry.at)}</div>
          <div>
            <strong className="block text-xs text-slate-900">{entry.lead.customer.name}</strong>
            {entry.kind === 'visit'
              ? <><span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={11}/>{entry.visit.place}</span><Badge tone={entry.visit.kind === 'Site Visit' ? 'violet' : 'teal'} className="mt-1">{entry.visit.kind}{entry.visit.status === 'Completed' ? ' · done' : entry.visit.confirmedAt ? ' · confirmed' : ' · to reconfirm'}</Badge></>
              : <><span className="mt-1 block text-[11px] text-slate-500">{entry.task.title}</span><span className="mt-1 inline-block"><TaskTypeBadge task={entry.task}/></span></>}
          </div>
        </Link>)}
      </Card>
    </div>
  </>
}
