import { CalendarPlus, CheckCircle2, ImagePlus, Paperclip, Save, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../contexts/DataContext'
import { siteVisitMissing } from '../../lib/rules'
import { fromLocalInput } from '../../lib/utils'
import { salesService } from '../../services/salesService'
import type { RoadWidth, SalesLead, SiteVisitReport, YesNo } from '../../types'
import { ChoiceGroup, Missing, Question } from '../sales'
import { Button, Card, EmptyState, Field } from '../ui'
import { VisitTracker } from './VisitTracker'

const YES_NO = ['Yes', 'No'] as const
const ROAD_WIDTHS: RoadWidth[] = ['20 ft', '30 ft', '40 ft', '60 ft', '100 ft']

/** Whiteboard "Property details": recorded on the site visit (own plot, or the land Land Sourcing identified). */
export function SiteVisitTab({ lead, readOnly }: { lead: SalesLead; readOnly: boolean }) {
  const { user } = useAuth()
  const { run } = useData()
  const [report, setReport] = useState<SiteVisitReport>(lead.siteVisit)
  const [at, setAt] = useState('')
  const defaultPlace = lead.landSourcing?.selectedOption ? `Identified land: ${lead.landSourcing.selectedOption.location}` : `Customer plot, ${lead.customer.location}, ${lead.customer.city}`
  const [place, setPlace] = useState(defaultPlace)
  if (!user) return null
  const visits = lead.visits.filter(visit => visit.kind === 'Site Visit').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
  const set = <K extends keyof SiteVisitReport>(key: K, value: SiteVisitReport[K]) => setReport(current => ({ ...current, [key]: value }))
  const waitingForLand = lead.queue === 'New Lead for Land Sourcing' && lead.landSourcing?.status !== 'Land Identified'
  const canSchedule = !readOnly && ['Meeting Done', 'SV Done'].includes(lead.stage) && !lead.visits.some(visit => visit.status === 'Scheduled')
  const editable = !readOnly && ['SV Scheduled', 'SV Done'].includes(lead.stage)
  const addFiles = (key: 'photos' | 'propertyDocuments', files: FileList | null) => {
    if (!files?.length) return
    set(key, [...report[key], ...Array.from(files).map(file => file.name)])
  }
  const remove = (key: 'photos' | 'propertyDocuments', name: string) => set(key, report[key].filter(item => item !== name))

  return <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
    <div className="space-y-4">
      {waitingForLand && <Card className="border-violet-200 bg-violet-50/40 p-4 text-sm text-violet-900">
        <strong className="block">Waiting for Land Sourcing</strong>
        <span className="mt-1 block text-xs leading-5">{lead.landSourcing?.reference} is with Land Sourcing ({lead.landSourcing?.status}). The site visit can be scheduled once land is identified.</span>
      </Card>}
      {canSchedule && !waitingForLand && <Card className="p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarPlus size={16}/> Schedule the site visit</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Date and time" required><input type="datetime-local" value={at} onChange={event => setAt(event.target.value)}/></Field>
          <Field label="Site" required><input value={place} onChange={event => setPlace(event.target.value)}/></Field>
        </div>
        <Button className="mt-3" onClick={() => run(() => salesService.scheduleVisit(lead.journeyId, 'Site Visit', fromLocalInput(at), place, user), 'Site visit scheduled')}>Schedule site visit</Button>
      </Card>}
      {visits.length === 0 && !canSchedule && !waitingForLand && <Card><EmptyState title="No site visit yet" description="A site visit can be scheduled once the meeting is done."/></Card>}
      {visits.map(visit => <VisitTracker key={visit.id} lead={lead} visit={visit} readOnly={readOnly}/>)}
    </div>

    <Card>
      <div className="section-title"><div><h2>Property details</h2><p>Recorded at the site visit; documents are optional</p></div></div>
      <fieldset disabled={!editable} className="space-y-4 p-4">
        <Question label="Actual site visited" required><ChoiceGroup label="Actual site visited" name="visited" options={YES_NO} value={report.actualSiteVisited} onChange={value => set('actualSiteVisited', value as YesNo)}/></Question>
        <Question label="Road access" required>
          <ChoiceGroup label="Road access" name="roadAccess" options={YES_NO} value={report.roadAccess} onChange={value => set('roadAccess', value as YesNo)}/>
        </Question>
        {report.roadAccess === 'Yes' && <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
          <Field label="Road-facing width of plot" required><input value={report.roadFacingWidth} onChange={event => set('roadFacingWidth', event.target.value)} placeholder="e.g. 40 ft"/></Field>
          <Field label="Road width" required><select value={report.roadWidth} onChange={event => set('roadWidth', event.target.value as RoadWidth)}><option value="">Choose…</option>{ROAD_WIDTHS.map(width => <option key={width}>{width}</option>)}</select></Field>
        </div>}
        <Question label="2 images of the plot and road facing" required hint="The preview keeps file names only; files will be stored once the backend is connected.">
          <FileList items={report.photos} onRemove={name => remove('photos', name)} disabled={!editable}/>
          <label className="btn btn-secondary btn-sm w-fit cursor-pointer"><ImagePlus size={14}/> Add photos<input className="sr-only" type="file" accept="image/*" capture="environment" multiple onChange={event => { addFiles('photos', event.target.files); event.target.value = '' }}/></label>
        </Question>
        <Question label="Property documents copy (optional)">
          <FileList items={report.propertyDocuments} onRemove={name => remove('propertyDocuments', name)} disabled={!editable}/>
          <label className="btn btn-secondary btn-sm w-fit cursor-pointer"><Paperclip size={14}/> Attach documents<input className="sr-only" type="file" accept="image/*,application/pdf" multiple onChange={event => { addFiles('propertyDocuments', event.target.files); event.target.value = '' }}/></label>
        </Question>
        <Question label="Verbal soil test confirmation" required><ChoiceGroup label="Soil test" name="soil" options={['OK', 'Not OK'] as const} value={report.soilTest} onChange={value => set('soilTest', value)}/></Question>
        <Question label="Borewell provision" required><ChoiceGroup label="Borewell provision" name="borewell" options={YES_NO} value={report.borewell} onChange={value => set('borewell', value as YesNo)}/></Question>
        {lead.stage === 'SV Scheduled' && <Missing items={siteVisitMissing(report)}/>}
        {editable && <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={() => run(() => salesService.saveSiteVisitReport(lead.journeyId, report, user), 'Property details saved')}><Save size={15}/> Save details</Button>
          {lead.stage === 'SV Scheduled' && <Button onClick={() => run(async () => { await salesService.saveSiteVisitReport(lead.journeyId, report, user); await salesService.completeSiteVisit(lead.journeyId, user) }, 'Site visit marked done')}><CheckCircle2 size={15}/> Save and mark site visit done</Button>}
        </div>}
      </fieldset>
    </Card>
  </div>
}

function FileList({ items, onRemove, disabled }: { items: string[]; onRemove: (name: string) => void; disabled: boolean }) {
  if (!items.length) return <span className="text-[11px] text-slate-400">Nothing added yet</span>
  return <ul className="flex flex-wrap gap-2">{items.map(name => <li key={name} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700">
    {name}{!disabled && <button type="button" onClick={() => onRemove(name)} aria-label={`Remove ${name}`} className="text-slate-400 hover:text-red-600"><X size={12}/></button>}
  </li>)}</ul>
}
