import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { AdminPage } from './AdminPage'
import { RecoveryPage } from '../auth/RecoveryPage'

function renderPage(page: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext value={{ user: { id: 'admin', email: 'admin@example.com', displayName: 'Admin', roles: ['ADMIN'] }, accessToken: 'token', loading: false, login: async () => {}, register: async () => {}, logout: async () => {} }}><MemoryRouter>{page}</MemoryRouter></AuthContext></QueryClientProvider>)
}
afterEach(() => vi.unstubAllGlobals())
describe('Administration and recovery', () => {
  it('requires a moderation reason and sends the selected user status', async () => {
    const fetch = vi.fn().mockImplementation(async (_url, init) => ({ ok: true, json: async () => ({ data: init?.method === 'PATCH' ? null : { content: [{ id: 'user-1', email: 'customer@example.com', status: 'ACTIVE' }], totalElements: 1 } }) }))
    vi.stubGlobal('fetch', fetch)
    renderPage(<AdminPage />)
    await screen.findByRole('heading', { name: 'customer@example.com' })
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'SUSPENDED')
    expect(screen.getByLabelText('Reason')).toBeRequired()
    await userEvent.type(screen.getByLabelText('Reason'), 'Repeated false listings')
    await userEvent.click(screen.getByRole('button', { name: 'Save status' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/admin/users/user-1'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'SUSPENDED', reason: 'Repeated false listings', expectedVersion: 0 }) })))
  })
  it('does not report success when recovery is rejected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Invalid or expired recovery code' }) }))
    renderPage(<RecoveryPage />)
    await userEvent.type(screen.getByLabelText('Recovery code'), 'expired-code')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword123!')
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired recovery code')
    expect(screen.queryByText(/Password updated/)).not.toBeInTheDocument()
  })
})
