import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { nextScheduledVisit } from '../../lib/rules'
import { formatDate, fromLocalInput, toLocalInput } from '../../lib/utils'
import { salesService } from '../../services/salesService'
import type { CallOutcome, SalesLead } from '../../types'
import { Button, Field, Modal } from '../ui'

const OUTCOMES: { value: CallOutcome; help: string }[] = [
  { value: 'Meeting Confirmed', help: 'Customer confirmed the next meeting or site visit' },
  { value: 'Rescheduled', help: 'Customer asked for another date or time' },
  { value: 'Spoke to Customer', help: 'Conversation without a change to the plan' },
  { value: 'RNR', help: 'Ringing, no response: moves to In Process' },
  { value: 'Switch Off', help: 'Phone switched off: moves to In Process' },
  { value: 'Call Back Later', help: 'Customer asked to call later: moves to In Process' },
  { value: 'Not Interested', help: 'Marks the journey dead' },
]

/** Every Sales call ends with an outcome and a comment that joins the feedback thread (DOMAIN.md §8). */
export function LogCallDialog({ lead, open, onOpenChange }: { lead: SalesLead; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth()
  const { run } = useData()
  const scheduled = nextScheduledVisit(lead)
  const [outcome, setOutcome] = useState<CallOutcome>(scheduled && !scheduled.confirmedAt ? 'Meeting Confirmed' : 'Spoke to Customer')
  const [notes, setNotes] = useState('')
  const [nextCallAt, setNextCallAt] = useState('')
  const [newVisitAt, setNewVisitAt] = useState(toLocalInput(scheduled?.scheduledAt))
  if (!user) return null
  const needsNextCall = outcome === 'RNR' || outcome === 'Switch Off' || outcome === 'Call Back Later'
  const save = async () => {
    const ok = await run(() => salesService.logCall(lead.journeyId, {
      outcome, notes, nextCallAt: needsNextCall ? fromLocalInput(nextCallAt) : undefined,
      newVisitAt: outcome === 'Rescheduled' ? fromLocalInput(newVisitAt) : undefined,
    }, user), outcome === 'Not Interested' ? 'Call logged; journey marked dead' : 'Call logged')
    if (ok) { setNotes(''); setNextCallAt(''); onOpenChange(false) }
  }
  return <Modal open={open} onOpenChange={onOpenChange} wide title={`Log call with ${lead.customer.name}`}
    description={scheduled ? `Next: ${scheduled.kind} on ${formatDate(scheduled.scheduledAt)}${scheduled.confirmedAt ? ' (confirmed)' : ' (not yet reconfirmed)'}` : 'No meeting or site visit is scheduled.'}
    footer={<><Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant={outcome === 'Not Interested' ? 'danger' : 'primary'} onClick={save}>Save call</Button></>}>
    <div className="grid gap-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-slate-700">Outcome <b className="text-red-600">*</b></legend>
        <div className="grid gap-2 sm:grid-cols-2">{OUTCOMES.map(item => <label key={item.value} className="checkbox-row cursor-pointer">
          <input type="radio" name="outcome" checked={outcome === item.value} onChange={() => setOutcome(item.value)}/>
          <span><strong className="block text-xs text-slate-800">{item.value}</strong><span className="text-[11px] text-slate-500">{item.help}</span></span>
        </label>)}</div>
      </fieldset>
      {needsNextCall && <Field label="Next call date and time" required><input type="datetime-local" value={nextCallAt} onChange={event => setNextCallAt(event.target.value)}/></Field>}
      {outcome === 'Rescheduled' && <Field label={`New ${scheduled?.kind.toLowerCase() ?? 'meeting'} date and time`} required><input type="datetime-local" value={newVisitAt} onChange={event => setNewVisitAt(event.target.value)}/></Field>}
      <Field label="Call comment" required hint="Added to the journey's feedback thread, which Telesales started."><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="What did the customer say?"/></Field>
    </div>
  </Modal>
}
