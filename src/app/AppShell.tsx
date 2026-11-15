import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CalendarDays, ChevronDown, ClipboardList, Columns3, Home, ListTodo, LogOut, Menu, Search, Settings, Users, Wallet, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useData } from '../contexts/DataContext'
import { isOverdueTask, isOverdueVisit } from '../lib/rules'
import { canManage, roleLabel } from '../lib/utils'

const primaryNav = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/leads', label: 'Leads', icon: ClipboardList },
  { to: '/pipeline', label: 'Pipeline by stage', icon: Columns3 },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/travel', label: 'Travel reimbursement', icon: Wallet },
]

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { leads, state } = useData()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  if (!user) return null
  const visible = new Set(leads.map(lead => lead.journeyId))
  // Same count as the Overdue tile: past-due tasks plus visits never checked in.
  const overdue = (state?.tasks.filter(task => visible.has(task.journeyId) && isOverdueTask(task)).length ?? 0)
    + leads.reduce((total, lead) => total + lead.visits.filter(visit => isOverdueVisit(visit)).length, 0)
  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    const query = search.trim()
    if (!query) return
    const match = leads.find(lead => lead.journeyId.toLowerCase() === query.toLowerCase() || lead.reference.toLowerCase() === query.toLowerCase())
    navigate(match ? `/leads/${match.journeyId}` : `/leads?search=${encodeURIComponent(query)}`)
    setSearch('')
  }
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '')
  const nav = <>
    <div className="brand"><div className="brand-mark">K</div><div><strong>KENNIX</strong><span>Sales CRM</span></div></div>
    <nav className="side-nav" aria-label="Primary navigation">
      {primaryNav.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={link}>
        <item.icon size={18}/><span>{item.label}</span>
        {item.to === '/tasks' && overdue > 0 && <span className="ml-auto rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{overdue}</span>}
      </NavLink>)}
      {canManage(user.role) && <><p className="nav-label">Management</p><NavLink to="/team" onClick={() => setMobileOpen(false)} className={link}><Users size={18}/><span>Team</span></NavLink></>}
      <p className="nav-label">Account</p>
      <NavLink to="/settings/profile" onClick={() => setMobileOpen(false)} className={link}><Settings size={18}/><span>Profile & settings</span></NavLink>
    </nav>
    <div className="sidebar-help"><CalendarDays size={18}/><div><strong>Telesales → Sales → Architecture</strong><span>Meeting · Site visit · Quotation · Token</span></div></div>
  </>
  return <div className="app-shell">
    <aside className="sidebar">{nav}</aside>
    {mobileOpen && <div className="mobile-nav"><button className="mobile-nav-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X/></button>{nav}</div>}
    <div className="app-main">
      <header className="topbar">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu/></Button>
        <form className="global-search" onSubmit={submitSearch}><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search Journey ID, customer, mobile…" aria-label="Global search"/></form>
        <div className="top-actions">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="user-trigger"><Avatar name={user.name} size="sm"/><span className="user-meta"><strong>{user.name}</strong><small>{user.title}</small></span><ChevronDown size={15}/></DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="dropdown-content w-64" align="end" sideOffset={8}>
                <div className="px-3 py-2"><p className="text-sm font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p><Badge tone="teal" className="mt-2">{roleLabel(user.role)}</Badge></div>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100"/>
                <DropdownMenu.Item className="dropdown-item" onSelect={() => navigate('/settings/profile')}><Settings size={16}/> Profile & settings</DropdownMenu.Item>
                <DropdownMenu.Item className="dropdown-item text-red-600" onSelect={() => { logout(); navigate('/login') }}><LogOut size={16}/> Sign out</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>
  </div>
}
