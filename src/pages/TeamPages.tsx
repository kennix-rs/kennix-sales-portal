import { Link } from 'react-router-dom'
import { Avatar, Badge, Card, PageHeader } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isNewLead, isOverdueTask, visibleOwnerIds } from '../lib/rules'
import { formatINR, roleLabel } from '../lib/utils'

/** Team Leads see their reporting team, Managers everyone. */
export function TeamPage() {
  const { user } = useAuth()
  const { state, users } = useData()
  if (!state || !user) return null
  const team = users.filter(member => visibleOwnerIds(user, users).has(member.id))
  return <>
    <PageHeader eyebrow="Management" title="Team" description="Workload, pipeline and travel claims per person."/>
    <Card><div className="table-wrap"><table className="data-table">
      <thead><tr><th>Person</th><th>Live journeys</th><th>New to reconfirm</th><th>Overdue tasks</th><th>Interested / negotiating</th><th>Closed</th><th>Claims pending</th></tr></thead>
      <tbody>{team.map(member => {
        const leads = state.leads.filter(lead => lead.ownerId === member.id)
        const live = leads.filter(lead => lead.stage !== 'Closed' && lead.stage !== 'Dead')
        const pending = state.claims.filter(claim => claim.ownerId === member.id && claim.status === 'Pending Approval')
        return <tr key={member.id}>
          <td><div className="person"><Avatar name={member.name} size="sm"/><div><strong>{member.name}</strong><span>{roleLabel(member.role)}</span></div></div></td>
          <td><Link to={`/leads?owner=${member.id}`}>{live.length}</Link></td>
          <td>{leads.filter(isNewLead).length}</td>
          <td>{state.tasks.filter(task => task.ownerId === member.id && isOverdueTask(task)).length}</td>
          <td>{leads.filter(lead => lead.stage === 'Interested' || lead.stage === 'Under Negotiation').length}</td>
          <td>{leads.filter(lead => lead.stage === 'Closed').length}</td>
          <td>{pending.length ? <Badge tone="amber">{pending.length} · {formatINR(pending.reduce((total, claim) => total + claim.amount, 0))}</Badge> : '—'}</td>
        </tr>
      })}</tbody>
    </table></div></Card>
  </>
}

export function ProfilePage() {
  const { user } = useAuth()
  const { users } = useData()
  if (!user) return null
  const manager = users.find(item => item.id === user.managerId)
  return <>
    <PageHeader eyebrow="Account" title="Profile & settings" description="Preview identity and Sales access."/>
    <div className="grid gap-5 lg:grid-cols-[.7fr_1.3fr]">
      <Card className="p-6 text-center"><Avatar name={user.name} size="lg"/><h2 className="mt-4 text-lg font-bold text-slate-900">{user.name}</h2><p className="mt-1 text-xs text-slate-500">{user.title}</p><Badge tone="teal" className="mt-2">{roleLabel(user.role)}</Badge></Card>
      <Card className="p-6"><h2 className="text-sm font-bold text-slate-900">Access</h2><dl className="mt-4 space-y-3 text-sm">
        <Row label="Email" value={user.email}/>
        <Row label="Reports to" value={manager?.name ?? '—'}/>
        <Row label="Journeys" value={user.role === 'executive' ? 'Your own' : user.role === 'team_lead' ? 'Your team' : 'All of Sales'}/>
        <Row label="Reassign journeys, approve travel claims" value={user.role === 'executive' ? 'No (Team Lead or Manager)' : 'Yes'}/>
      </dl></Card>
    </div>
  </>
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold text-slate-800">{value}</dd></div>
}
