import { BadgeIndianRupee, CheckCircle2, FileText, Handshake, MessageCircle, Sparkles, Upload } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { formatDate, formatINR, fromLocalInput } from '../../lib/utils'
import { salesService } from '../../services/salesService'
import type { SalesLead } from '../../types'
import { Fact } from '../sales'
import { Badge, Button, Card, Field } from '../ui'

export const ARCHITECTS = ['Ar. Nikhil Bose', 'Ar. Shreya Kulkarni', 'Ar. Farhan Siddiqui']

/** The WhatsApp message for sharing the quotation; opened with wa.me so it goes from the executive's phone. */
export function quotationWhatsAppLink(lead: SalesLead) {
  const quote = lead.architecture?.quotation
  const digits = lead.customer.mobile.replace(/\D/g, '').slice(-10)
  const text = quote
    ? `Hello ${lead.customer.name}, here is your KENNIX quotation ${quote.number} for ${formatINR(quote.amount)} (${quote.fileName}). The actual price may vary by ±20% from this quotation. — ${lead.architecture?.architect}, KENNIX`
    : ''
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`
}

/**
 * Whiteboard and voice notes: Interested → the client's details go to the Architecture team; the architect
 * takes the requirements on a call with the customer and Sales and uploads a quotation (actual price may vary
 * ±20%) → Sales shares it with the client on WhatsApp → Under Negotiation → the customer pays the token amount
 * and it closes → Sales hands over to the Architecture team with a call (client, architect, Sales).
 */
export function DealTab({ lead, readOnly }: { lead: SalesLead; readOnly: boolean }) {
  const { user } = useAuth()
  const { run } = useData()
  const [architect, setArchitect] = useState(ARCHITECTS[0])
  const [callAt, setCallAt] = useState('')
  const [quoteNumber, setQuoteNumber] = useState(`QT-${lead.journeyId.slice(-6)}`)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteFile, setQuoteFile] = useState('')
  const [token, setToken] = useState('')
  const [paymentRef, setPaymentRef] = useState('')
  const [handoverAt, setHandoverAt] = useState('')
  if (!user) return null
  const arch = lead.architecture
  const quote = arch?.quotation
  const amount = (value: string) => Number(value.replace(/[^\d.]/g, ''))
  const share = () => {
    window.open(quotationWhatsAppLink(lead), '_blank', 'noopener')
    void run(() => salesService.shareQuotation(lead.journeyId, user), 'Quotation shared on WhatsApp')
  }

  return <div className="grid gap-5 lg:grid-cols-2">
    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Sparkles size={16} className="text-teal-600"/> Architecture</h2>
      {!arch && (readOnly || !['Meeting Done', 'SV Done'].includes(lead.stage)
        ? <p className="mt-3 text-xs text-slate-500">Available once the meeting{lead.queue === 'New Leads' ? ' or site visit' : ''} is done and the customer wants to go ahead.</p>
        : <div className="mt-4 space-y-3">
          <p className="text-xs leading-5 text-slate-600">Customer wants to go ahead? Marking them interested shares the client’s details with the Architecture team. Fix a call with the customer, the architect and you to take the requirements.</p>
          <Field label="Architect" required><select value={architect} onChange={event => setArchitect(event.target.value)}>{ARCHITECTS.map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Call with customer and architect" required><input type="datetime-local" value={callAt} onChange={event => setCallAt(event.target.value)}/></Field>
          <Button onClick={() => run(() => salesService.markInterested(lead.journeyId, architect, fromLocalInput(callAt), user), 'Marked interested; architect call fixed')}><Sparkles size={15}/> Mark interested</Button>
        </div>)}
      {arch && <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Fact label="Architect" value={arch.architect}/>
        <Fact label="Requirement call" value={formatDate(arch.callAt)}/>
      </dl>}
      {arch && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">The Architecture team sees the client’s full details from the Interested stage and uploads the quotation, a rough estimate: the actual price may vary ±20%.</p>}
    </Card>

    <Card className="p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><FileText size={16} className="text-teal-600"/> Quotation and negotiation</h2>
      {quote && <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Fact label="Quotation" value={quote.number}/><Fact label="Amount (actual may vary ±20%)" value={formatINR(quote.amount)}/>
        <Fact label="File" value={quote.fileName}/><Fact label="Uploaded by" value={`${quote.uploadedBy}, ${formatDate(quote.uploadedAt)}`}/>
        <Fact label="Shared with client" value={arch?.shared ? `On ${arch.shared.via}, ${formatDate(arch.shared.at)}` : 'Not yet'}/>
        <Fact label="Status" value={<Badge tone={lead.stage === 'Closed' ? 'green' : arch?.shared ? 'orange' : 'amber'}>{lead.stage === 'Closed' ? 'Accepted' : arch?.shared ? 'Under negotiation' : 'Ready to share'}</Badge>}/>
      </dl>}
      {quote && !arch?.shared && lead.stage === 'Interested' && !readOnly && <Button className="mt-4" onClick={share}><MessageCircle size={15}/> Share on WhatsApp</Button>}
      {!quote && lead.stage === 'Interested' && !readOnly && <div className="mt-4 space-y-3">
        <p className="text-xs leading-5 text-slate-600">The architect uploads the quotation after the requirement call. Until the Architecture portal exists, upload it here on their behalf.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Quotation number" required><input value={quoteNumber} onChange={event => setQuoteNumber(event.target.value)}/></Field>
          <Field label="Amount (₹)" required><input inputMode="numeric" value={quoteAmount} onChange={event => setQuoteAmount(event.target.value)} placeholder="e.g. 21500000"/></Field>
        </div>
        <Field label="Quotation file" required hint={quoteFile || 'PDF from the architect; the preview keeps the file name only.'}><input type="file" accept="application/pdf,image/*" onChange={event => setQuoteFile(event.target.files?.[0]?.name ?? '')}/></Field>
        <Button variant="secondary" onClick={() => run(() => salesService.uploadQuotation(lead.journeyId, { number: quoteNumber, amount: amount(quoteAmount), fileName: quoteFile }, user), 'Quotation uploaded')}><Upload size={15}/> Upload architect’s quotation</Button>
      </div>}
      {!quote && lead.stage !== 'Interested' && <p className="mt-3 text-xs text-slate-500">The architect’s quotation comes after the customer is interested.</p>}
    </Card>

    <Card className="p-5 lg:col-span-2">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Handshake size={16} className="text-teal-600"/> Closing and handover</h2>
      {lead.closing
        ? <dl className="mt-4 grid gap-4 sm:grid-cols-4"><Fact label="Token amount" value={formatINR(lead.closing.tokenAmount)}/><Fact label="Paid" value={formatDate(lead.closing.paidAt)}/><Fact label="Payment reference" value={lead.closing.paymentReference}/><Fact label="Handover call" value={formatDate(lead.closing.handoverCallAt)}/></dl>
        : lead.stage === 'Under Negotiation' && !readOnly
          ? <div className="mt-4 space-y-3">
            <p className="text-xs leading-5 text-slate-600">Once the client is happy with the quotation they pay a token amount (usually ₹2–3 lakh) as confirmation, and the journey closes. Then fix a handover call with the customer, {arch?.architect ?? 'the architect'} and Sales.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Token amount (₹)" required><input inputMode="numeric" value={token} onChange={event => setToken(event.target.value)} placeholder="e.g. 200000"/></Field>
              <Field label="Payment reference" required><input value={paymentRef} onChange={event => setPaymentRef(event.target.value)} placeholder="UTR or receipt number"/></Field>
              <Field label="Handover call" required><input type="datetime-local" value={handoverAt} onChange={event => setHandoverAt(event.target.value)}/></Field>
            </div>
            <Button variant="gold" onClick={() => run(() => salesService.closeDeal(lead.journeyId, { tokenAmount: amount(token), paymentReference: paymentRef, handoverCallAt: fromLocalInput(handoverAt) }, user), 'Closed; handover call fixed')}><BadgeIndianRupee size={15}/> Token received: close</Button>
          </div>
          : <p className="mt-3 text-xs text-slate-500">{lead.stage === 'Dead' ? `Marked dead: ${lead.deadReason}` : lead.stage === 'Sales Rejected' ? 'Sent back to Telesales.' : 'Closing follows the quotation and negotiation.'}</p>}
      {lead.stage === 'Closed' && <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-green-700"><CheckCircle2 size={15}/> Handed over to the Architecture team. The journey is read-only in Sales.</p>}
    </Card>
  </div>
}
