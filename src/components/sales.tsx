import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { STAGES } from '../lib/rules'
import { cn, stageTone } from '../lib/utils'
import type { Priority, SalesLead, SalesStage, Task } from '../types'
import { Badge } from './ui'

export function StageBadge({ lead }: { lead: Pick<SalesLead, 'stage' | 'inProcessReason'> }) {
  return <Badge tone={stageTone(lead.stage)}>{lead.stage}{lead.stage === 'In Process' && lead.inProcessReason ? ` · ${lead.inProcessReason}` : ''}</Badge>
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priority === 'High' ? 'red' : priority === 'Medium' ? 'amber' : 'slate'}>{priority}</Badge>
}

export function QueueBadge({ lead }: { lead: Pick<SalesLead, 'queue' | 'landSourcing'> }) {
  if (lead.queue === 'New Leads') return <Badge tone="teal">Own land</Badge>
  return <Badge tone={lead.landSourcing?.status === 'Land Identified' ? 'green' : 'violet'}>{lead.landSourcing?.status === 'Land Identified' ? 'Land identified' : 'Land sourcing'}</Badge>
}

export function TaskTypeBadge({ task }: { task: Task }) {
  return <Badge tone={task.type === 'Reconfirm Meeting' ? 'blue' : task.type === 'Architect Call' || task.type === 'Handover Call' ? 'violet' : 'amber'}>{task.type}</Badge>
}

/** Radio buttons styled as chips, for the whiteboard's tick-box questions. */
export function ChoiceGroup<T extends string>({ name, options, value, onChange, disabled, label }: {
  name: string; options: readonly T[]; value: T | ''; onChange: (value: T) => void; disabled?: boolean; label: string
}) {
  return <div role="radiogroup" aria-label={label} className="choice-group">
    {options.map(option => <label key={option} className="choice">
      <input type="radio" name={name} value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)}/>
      {option}
    </label>)}
  </div>
}

export function Question({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return <div className="flex flex-col gap-2">
    <span className="text-xs font-semibold text-slate-700">{label}{required && <b className="text-red-600" aria-hidden="true"> *</b>}</span>
    {children}
    {hint && <small className="text-[11px] text-slate-500">{hint}</small>}
  </div>
}

const FLOW: SalesStage[] = STAGES.filter(stage => stage !== 'In Process' && stage !== 'Dead' && stage !== 'Sales Rejected')

/** Where the journey is on the way to Closed. "In Process" shows the stage it will resume. */
export function StageStrip({ lead }: { lead: SalesLead }) {
  const current = lead.stage === 'In Process' ? lead.resumeStage ?? 'Meeting Scheduled' : lead.stage
  const index = FLOW.indexOf(current)
  return <ol className="stage-strip" aria-label="Sales stages">
    {FLOW.map((stage, position) => {
      const ended = lead.stage === 'Dead' || lead.stage === 'Sales Rejected'
      const done = !ended && position < index
      const isCurrent = !ended && position === index
      return <li key={stage} className={cn('stage-step', done && 'done', isCurrent && 'current')} aria-current={isCurrent ? 'step' : undefined}>
        {done && <Check size={12}/>}{stage}
      </li>
    })}
  </ol>
}

export function Missing({ items }: { items: string[] }) {
  if (!items.length) return null
  return <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
    <strong className="block">Still needed ({items.length})</strong>
    <span className="mt-1 block leading-5">{items.join(' · ')}</span>
  </div>
}

export function Fact({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</dd></div>
}
