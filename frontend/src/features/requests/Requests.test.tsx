import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { RequestButtons, RequestInbox } from './Requests'
import { InventoryImport } from '../stores/InventoryImport'
import { csvHeader } from '../stores/inventoryCsv'

function renderPage(page: React.ReactNode, role: 'CUSTOMER' | 'STORE_OWNER' = 'CUSTOMER') {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext value={{ user: { id: 'test', email: 'test@example.com', displayName: 'Test', roles: [role] }, accessToken: 'token', loading: false, login: async () => {}, register: async () => {}, logout: async () => {} }}><MemoryRouter>{page}</MemoryRouter></AuthContext></QueryClientProvider>)
}
afterEach(() => vi.unstubAllGlobals())
it('sends a reservation request and links to its inbox', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'request' } }) })
  vi.stubGlobal('fetch', fetch); renderPage(<RequestButtons listingId="listing" />)
  await userEvent.click(screen.getByRole('button', { name: 'Request reservation' }))
  await userEvent.type(screen.getByLabelText('Message (optional)'), 'Collect shortly')
  await userEvent.click(screen.getByRole('button', { name: 'Send request' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/requests'), expect.objectContaining({ method: 'POST', body: JSON.stringify({ quantity: 1, message: 'Collect shortly', listingId: 'listing', kind: 'RESERVATION' }) })))
  expect(await screen.findByRole('link', { name: 'View my requests' })).toHaveAttribute('href', '/requests')
})
it('does not offer merchant actions on expired requests', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { totalElements: 1, content: [{ id: 'r', kind: 'RESERVATION', quantity: 1, status: 'EXPIRED', productName: 'Rice', variant: '1kg', storeName: 'Store', storeId: 'store', customerName: 'Customer', message: '', response: '', quotedAmount: null }] } }) }))
  renderPage(<RequestInbox storeId="store" />, 'STORE_OWNER')
  await screen.findByText('Reservation · EXPIRED')
  expect(screen.queryByRole('button', { name: 'Confirm 2-hour hold' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Mark collected' })).not.toBeInTheDocument()
})
it('previews CSV before confirmation and displays a commit conflict without success', async () => {
  const fetch = vi.fn().mockImplementation(async (_url, init) => JSON.parse(init.body).preview ? { ok: true, json: async () => ({ data: { added: 1, updated: 0 } }) } : { ok: false, json: async () => ({ message: 'Import row was updated; reload and retry' }) })
  vi.stubGlobal('fetch', fetch); renderPage(<InventoryImport token="token" storeId="store" />, 'STORE_OWNER')
  const file = new File(['csv'], 'inventory.csv', { type: 'text/csv' })
  Object.defineProperty(file, 'text', { value: async () => csvHeader + '\n12345678-1234-1234-1234-123456789abc,20,5,AVAILABLE,,' })
  await userEvent.upload(screen.getByLabelText('Choose CSV file'), file)
  expect(await screen.findByText('Preview: 1 new, 0 updated items.')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Confirm import' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Import row was updated')
  expect(screen.queryByText('Inventory imported successfully.')).not.toBeInTheDocument()
})
