import * as ToastPrimitive from '@radix-ui/react-toast'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Tone = 'success' | 'error'
interface ToastItem { id: number; title: string; description?: string; tone: Tone }
const ToastContext = createContext<{ toast: (title: string, description?: string, tone?: Tone) => void } | null>(null)
let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const toast = useCallback((title: string, description?: string, tone: Tone = 'success') => setItems(current => [...current, { id: ++nextId, title, description, tone }]), [])
  return <ToastContext.Provider value={{ toast }}><ToastPrimitive.Provider swipeDirection="right">{children}{items.map(item => (
    <ToastPrimitive.Root key={item.id} defaultOpen duration={item.tone === 'error' ? 6000 : 3500} onOpenChange={open => !open && setItems(current => current.filter(entry => entry.id !== item.id))} className={`toast-root ${item.tone === 'error' ? 'toast-error' : ''}`}>
      {item.tone === 'error' ? <AlertCircle className="shrink-0 text-red-600" size={20}/> : <CheckCircle2 className="shrink-0 text-teal-600" size={20}/>}<div><ToastPrimitive.Title className="font-semibold text-slate-900">{item.title}</ToastPrimitive.Title>{item.description && <ToastPrimitive.Description className="mt-0.5 text-sm text-slate-600">{item.description}</ToastPrimitive.Description>}</div><ToastPrimitive.Close className="ml-auto text-slate-400" aria-label="Close"><X size={16}/></ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))}<ToastPrimitive.Viewport className="fixed bottom-5 right-5 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none"/></ToastPrimitive.Provider></ToastContext.Provider>
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used within ToastProvider')
  return value
}
