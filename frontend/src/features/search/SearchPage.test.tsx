import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { SearchPage } from './SearchPage'
import { AuthContext } from '../auth/AuthContext'

afterEach(() => vi.unstubAllGlobals())
it('requests server-wide sorting and resets pagination when filters change', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { content: [], totalElements: 40 } }) })
  vi.stubGlobal('fetch', fetch)
  render(<QueryClientProvider client={new QueryClient()}><AuthContext value={{ user: null, accessToken: null, loading: false, login: async () => {}, register: async () => {}, logout: async () => {} }}><MemoryRouter initialEntries={['/search?q=butter&latitude=12.9&longitude=77.6&page=1']}><SearchPage /></MemoryRouter></AuthContext></QueryClientProvider>)
  await screen.findByText('Page 2 · 40 offers')
  await userEvent.selectOptions(screen.getByLabelText('Sort by:'), 'price')
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('sort=PRICE') && url.includes('page=0'))).toBe(true))
  await userEvent.click(screen.getByRole('button', { name: 'Filter: In Stock Only' }))
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('inStockOnly=true'))).toBe(true))
  await userEvent.click(screen.getByRole('button', { name: '< 1 km' }))
  await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.includes('radiusKm=1'))).toBe(true))
})
