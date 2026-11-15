import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { visibleLeads } from '../lib/rules'
import { SalesError, salesService } from '../services/salesService'
import type { SalesLead, SalesState, User } from '../types'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface DataValue {
  state: SalesState | null
  users: User[]
  /** The journeys the signed-in user may see. */
  leads: SalesLead[]
  refresh: () => Promise<void>
  /** Runs one action, shows its success message or the reason it was refused, then reloads. */
  run: (action: () => Promise<unknown>, success: string) => Promise<boolean>
}
const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [state, setState] = useState<SalesState | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const refresh = useCallback(async () => {
    const [snapshot, accounts] = await Promise.all([salesService.getState(), salesService.listUsers()])
    setState(snapshot)
    setUsers(accounts)
  }, [])
  useEffect(() => { if (user) void refresh() }, [user, refresh])
  const run = useCallback(async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      toast(success)
      return true
    } catch (error) {
      const missing = error instanceof SalesError ? error.missing : undefined
      toast(error instanceof Error ? error.message : 'Something went wrong', missing?.join(' · '), 'error')
      return false
    } finally {
      await refresh()
    }
  }, [refresh, toast])
  const leads = useMemo(() => (state && user ? visibleLeads(state, user, users) : []), [state, user, users])
  const value = useMemo(() => ({ state, users, leads, refresh, run }), [state, users, leads, refresh, run])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData must be used within DataProvider')
  return value
}
