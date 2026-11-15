import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '../App'
import { AuthProvider } from '../contexts/AuthContext'
import { DataProvider } from '../contexts/DataContext'
import { ToastProvider } from '../contexts/ToastContext'
import { previewUsers } from '../data/fixtures'

function renderAt(path: string, userId?: string) {
  localStorage.clear()
  if (userId) localStorage.setItem('kennix.sales.auth.v1', JSON.stringify(previewUsers.find(user => user.id === userId)))
  return render(<MemoryRouter initialEntries={[path]}><AuthProvider><ToastProvider><DataProvider><App/></DataProvider></ToastProvider></AuthProvider></MemoryRouter>)
}

beforeEach(() => localStorage.clear())

describe('Sales portal', () => {
  it('shows the sign-in page with the Sales preview accounts', () => {
    renderAt('/login')
    expect(screen.getByText('Sign in to your Kennix sales workspace.')).toBeInTheDocument()
    for (const user of previewUsers) expect(screen.getByText(user.name)).toBeInTheDocument()
  })

  it('shows the whiteboard tiles on the home page for an executive', async () => {
    renderAt('/home', 's-ishaan')
    const tile = async (label: string) => (await screen.findByText(label)).closest('a')!
    // Ishaan's unconfirmed Telesales meetings: Varun Sehgal, Arnav Chopra and Lakshay Gupta.
    expect(within(await tile('New leads')).getByText('3')).toBeInTheDocument()
    expect(within(await tile('Land sourcing leads')).getByText('5')).toBeInTheDocument()
    expect(await tile('Overdue tasks')).toHaveAttribute('href', '/tasks?view=overdue')
    expect(screen.getByText('Pipeline by stage', { selector: 'h2' })).toBeInTheDocument()
  })

  it('filters the leads list to land sourcing journeys from the tile link', async () => {
    renderAt('/leads?view=land-sourcing', 's-ishaan')
    expect(await screen.findByText('Neha Kapoor')).toBeInTheDocument()
    expect(screen.getByText('Pooja Malhotra')).toBeInTheDocument()
    // Own-land journeys and other executives' journeys are not listed.
    expect(screen.queryByText('Arnav Chopra')).not.toBeInTheDocument()
    expect(screen.queryByText('Deepak Yadav')).not.toBeInTheDocument()
  })

  it('opens a journey on the meeting form with the identified land in the overview', async () => {
    renderAt('/leads/KX-2026-000257', 's-ishaan')
    expect(await screen.findByRole('heading', { name: 'Pooja Malhotra' })).toBeInTheDocument()
    expect(screen.getByText('Meeting details')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start meeting/ })).toBeInTheDocument()
    expect(screen.getByText('T · fixed by Telesales')).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Property type' })).toBeInTheDocument()
  })

  it('shows stage alerts under the bell for a Team Lead, not for an executive', async () => {
    renderAt('/home', 's-manish')
    expect(await screen.findByRole('button', { name: /Stage alerts, \d+ unread/ })).toBeInTheDocument()
    cleanup()
    renderAt('/home', 's-ishaan')
    await screen.findByText('Your sales day')
    expect(screen.queryByRole('button', { name: /Stage alerts/ })).not.toBeInTheDocument()
  })

  it('keeps the Team page for Team Leads and Managers', async () => {
    renderAt('/team', 's-tanvi')
    expect(await screen.findByText('This area is restricted')).toBeInTheDocument()
  })
})
