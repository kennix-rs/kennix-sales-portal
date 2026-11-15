import { BadgeIndianRupee, CheckCircle2, FileText, Handshake, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { formatDate, formatINR, fromLocalInput } from '../../lib/utils'
import { salesService } from '../../services/salesService'
import type { SalesLead } from '../../types'
import { Fact } from '../sales'
import { Badge, Button, Card, Field } from '../ui'

export const ARCHITECTS = ['Ar. Nikhil Bose', 'Ar. Shreya Kulkarni', 'Ar. Farhan Siddiqui']

/**
 * Whiteboard: Interested → Sales connects the client with an architect, who takes the requirements and
 * gives a rough estimate (±20% of actual cost) → quotation → Under Negotiation → the customer pays the
 * token amount and it closes → Sales hands over to the Architect team with a call (client, architect, Sales).
 */
export function DealTab({ lead, readOnly }: { lead: SalesLead; readOnly: boolean }) {
  const { user } = useAuth()
  const { run } = useData()
  const [architect, setArchitect] = useState(ARCHITECTS[0])
  const [callAt, setCallAt] = useState('')
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [estimateNotes, setEstimateNotes] = useState('')
  const [quoteNumber, setQuoteNumber] = useState(`QT-${lead.journeyId.slice(-6)}`)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [token, setToken] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [handoverAt, setHandoverAt] = useState('')
  if (!user) return null
  const arch = lead.architecture
  const amount = (value: string) => Number(value.replace(/[^\d.]/g, ''))

  return <div className="grid gap-5 lg:grid-cols-2">
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles size={16} className="text-teal-600"/> Architecture and estimate</h2>
      {!arch && (readOnly || !['Meeting Done', 'SV Done'].includes(lead.stage)
        ? <p className="mt-3 text-xs text-slate-500">Available once the meeting{lead.queue === 'New Leads' ? ' or site visit' : ''} is done and the customer is interested.</p>
        : <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-slate-600">Customer interested? Fix a call with an architect, who takes the requirements and gives a rough estimate within ±20% of the actual cost.</p>
          <Field label="Architect" required><select value={architect} onChange={event => setArchitect(event.target.value)}>{ARCHITECTS.map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Call with customer and architect" required><input type="datetime-local" value={callAt} onChange={event => setCallAt(event.target.value)}/></Field>
          <Button onClick={() => run(() => salesService.markInterested(lead.journeyId, architect, fromLocalInput(callAt), user), 'Marked interested; architect call fixed')}><Sparkles size={15}/> Mark interested</Button>
        </div>)}
      {arch && <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Fact label="Architect" value={arch.architect}/>
        <Fact label="Requirement call" value={formatDate(arch.callAt)}/>
        <Fact label="Rough estimate (±20%)" value={arch.estimateLow !== undefined ? `${formatINR(arch.estimateLow)} – ${formatINR(arch.estimateHigh!)}` : 'Not recorded yet'}/>
        <Fact label="Estimate notes" value={arch.estimateNotes}/>
      </dl>}
      {arch && lead.stage === 'Interested' && arch.estimateLow === undefined && !readOnly && <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <Field label="Estimate from (₹)" required><input inputMode="numeric" value={low} onChange={event => setLow(event.target.value)} placeholder="e.g. 18000000"/></Field>
        <Field label="Estimate to (₹)" required><input inputMode="numeric" value={high} onChange={event => setHigh(event.target.value)} placeholder="e.g. 24000000"/></Field>
        <div className="sm:col-span-2"><Field label="Notes"><textarea value={estimateNotes} onChange={event => setEstimateNotes(event.target.value)} placeholder="What drives the estimate?"/></Field></div>
        <Button className="w-fit" onClick={() => run(() => salesService.recordEstimate(lead.journeyId, amount(low), amount(high), estimateNotes, user), 'Estimate recorded')}>Record estimate</Button>
      </div>}
    </Card>

    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={16} className="text-teal-600"/> Quotation and negotiation</h2>
      {arch?.quotation
        ? <dl className="mt-4 grid gap-4 sm:grid-cols-2"><Fact label="Quotation" value={arch.quotation.number}/><Fact label="Amount" value={formatINR(arch.quotation.amount)}/><Fact label="Shared" value={formatDate(arch.quotation.sharedAt)}/><Fact label="Status" value={<Badge tone={lead.stage === 'Closed' ? 'green' : 'orange'}>{lead.stage === 'Closed' ? 'Accepted' : 'Under negotiation'}</Badge>}/></dl>
        : lead.stage === 'Interested' && arch?.estimateLow !== undefined && !readOnly
          ? <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-600">Share the quotation with the customer; the journey moves to Under Negotiation.</p>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Quotation number" required><input value={quoteNumber} onChange={event => setQuoteNumber(event.target.value)}/></Field><Field label="Amount (₹)" required><input inputMode="numeric" value={quoteAmount} onChange={event => setQuoteAmount(event.target.value)} placeholder="e.g. 21500000"/></Field></div>
            <Button onClick={() => run(() => salesService.shareQuotation(lead.journeyId, quoteNumber, amount(quoteAmount), user), 'Quotation shared')}>Share quotation</Button>
          </div>
          : <p className="mt-3 text-xs text-slate-500">The quotation follows the architect’s estimate.</p>}
    </Card>

    <Card className="p-5 lg:col-span-2">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Handshake size={16} className="text-teal-600"/> Closing and handover</h2>
      {lead.closing
        ? <dl className="mt-4 grid gap-4 sm:grid-cols-4"><Fact label="Token amount" value={formatINR(lead.closing.tokenAmount)}/><Fact label="Paid" value={formatDate(lead.closing.paidAt)}/><Fact label="Payment reference" value={lead.closing.paymentReference}/><Fact label="Handover call" value={formatDate(lead.closing.handoverCallAt)}/></dl>
        : lead.stage === 'Under Negotiation' && !readOnly
          ? <div className="mt-4 space-y-3">
            <p className="text-xs leading-5 text-slate-600">When the customer pays the token amount the journey closes. Then fix a handover call with the customer, {arch?.architect ?? 'the architect'} and Sales.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Token amount (₹)" required><input inputMode="numeric" value={token} onChange={event => setToken(event.target.value)} placeholder="e.g. 500000"/></Field>
              <Field label="Payment reference" required><input value={paymentRef} onChange={event => setPaymentRef(event.target.value)} placeholder="UTR or receipt number"/></Field>
              <Field label="Handover call" required><input type="datetime-local" value={handoverAt} onChange={event => setHandoverAt(event.target.value)}/></Field>
            </div>
            <Button variant="gold" onClick={() => run(() => salesService.closeDeal(lead.journeyId, { tokenAmount: amount(token), paymentReference: paymentRef, handoverCallAt: fromLocalInput(handoverAt) }, user), 'Closed; handover call fixed')}><BadgeIndianRupee size={15}/> Token received: close</Button>
          </div>
          : <p className="mt-3 text-xs text-slate-500">{lead.stage === 'Dead' ? `Marked dead: ${lead.deadReason}` : 'Closing follows the quotation and negotiation.'}</p>}
      {lead.stage === 'Closed' && <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-green-700"><CheckCircle2 size={15}/> Handed over to the Architecture team. The journey is read-only in Sales.</p>}
    </Card>
  </div>
}
