import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Role, SalesStage } from '../types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/**
 * The preview runs on a demo clock so the sample data always looks current: it starts at
 * Monday 16 Nov 2026, 10:00 IST and moves forward with real time while the page is open.
 */
export const REFERENCE_NOW = new Date('2026-11-16T10:00:00+05:30')
const pageLoadedAt = Date.now()
export function now() {
  return new Date(REFERENCE_NOW.getTime() + (Date.now() - pageLoadedAt))
}

export function formatDate(value?: string, includeTime = true) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function formatINR(amount: number) {
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2).replace(/\.?0+$/, '')} Cr`
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2).replace(/\.?0+$/, '')} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** `datetime-local` input value ↔ ISO string. */
export function toLocalInput(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
export function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : ''
}

export function roleLabel(role: Role) {
  return ({ executive: 'Sales Executive', team_lead: 'Sales Team Lead', manager: 'Sales Manager' } as const)[role]
}

export function canManage(role: Role) {
  return role === 'team_lead' || role === 'manager'
}

export function stageTone(stage: SalesStage) {
  return ({
    'In Process': 'amber',
    'Meeting Scheduled': 'blue',
    'Meeting Done': 'teal',
    'SV Scheduled': 'violet',
    'SV Done': 'teal',
    Interested: 'green',
    'Under Negotiation': 'orange',
    Closed: 'green',
    Dead: 'slate',
    'Sales Rejected': 'red',
  } as const)[stage]
}

export function teamReference(teamCode: 'SH' | 'LS', journeyId: string) {
  return journeyId.replace(/^KX-/, `KX-${teamCode}-`)
}

let sequence = 0
/** Unique enough IDs for the preview's local data. */
export function makeId(prefix: string) {
  sequence += 1
  return `${prefix}-${Date.now().toString(36)}${sequence.toString(36)}`
}
