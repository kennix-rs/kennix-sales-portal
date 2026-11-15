import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './app/AppShell'
import { AccessDenied } from './components/ui'
import { useAuth } from './contexts/AuthContext'
import { canManage } from './lib/utils'
import { CalendarPage } from './pages/CalendarPage'
import { HomePage } from './pages/HomePage'
import { LeadDetailPage } from './pages/LeadDetailPage'
import { LeadsPage } from './pages/LeadsPage'
import { LoginPage } from './pages/LoginPage'
import { PipelinePage } from './pages/PipelinePage'
import { TasksPage } from './pages/TasksPage'
import { ProfilePage, TeamPage } from './pages/TeamPages'
import { TravelPage } from './pages/TravelPage'

function ProtectedLayout() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace/>
  return <AppShell><Routes>
    <Route path="/home" element={<HomePage/>}/>
    <Route path="/leads" element={<LeadsPage/>}/>
    <Route path="/leads/:journeyId" element={<LeadDetailPage/>}/>
    <Route path="/pipeline" element={<PipelinePage/>}/>
    <Route path="/calendar" element={<CalendarPage/>}/>
    <Route path="/tasks" element={<TasksPage/>}/>
    <Route path="/travel" element={<TravelPage/>}/>
    <Route path="/team" element={canManage(user.role) ? <TeamPage/> : <AccessDenied/>}/>
    <Route path="/settings/profile" element={<ProfilePage/>}/>
    <Route path="*" element={<Navigate to="/home" replace/>}/>
  </Routes></AppShell>
}

export default function App() {
  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/*" element={<ProtectedLayout/>}/>
  </Routes>
}
