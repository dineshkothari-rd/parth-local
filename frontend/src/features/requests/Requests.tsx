import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../auth/api'
import { useAuth } from '../auth/AuthContext'
import { inputClass, PageShell, StorePagination } from '../stores/StorePages'

type StockRequest = {
  id: string; kind: 'ENQUIRY' | 'RESERVATION'; quantity: number; message: string; response: string
  status: string; expiresAt: string; storeName: string; storeId: string; productName: string; variant: string
  customerName: string; quotedAmount: number | null; currency: string | null
}

export function RequestButtons({ listingId }: { listingId: string }) {
  const { user, accessToken } = useAuth()
  const [kind, setKind] = useState<'ENQUIRY' | 'RESERVATION' | null>(null)
  const create = useMutation({ mutationFn: (input: { quantity: number; message: string }) => apiRequest('/requests', { method: 'POST', body: JSON.stringify({ ...input, listingId, kind }) }, accessToken!) })
  if (!user?.roles.includes('CUSTOMER')) return <Link className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline" to="/login">Sign in to ask about stock</Link>
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    create.mutate({ quantity: Number(data.get('quantity')), message: String(data.get('message')) })
  }
  return <div className="mt-3">
    {!kind && <div className="flex flex-wrap gap-2">{(['ENQUIRY', 'RESERVATION'] as const).map(value => <button className="min-h-11 rounded-lg border px-3 text-sm font-semibold" onClick={() => { create.reset(); setKind(value) }} key={value} type="button">{value === 'ENQUIRY' ? 'Ask about stock' : 'Request reservation'}</button>)}</div>}
    {kind && <form className="space-y-3 rounded-lg border p-3" onSubmit={submit}><p className="text-sm text-stone-600">{kind === 'RESERVATION' ? 'The merchant must confirm. Confirmed items are held for 2 hours; pay and collect at the store.' : 'The merchant replies here. Check your requests for a response.'}</p><label className="block text-sm font-semibold">Quantity<input className={inputClass} name="quantity" type="number" min={1} max={100} defaultValue={1} required disabled={create.isSuccess} /></label><label className="block text-sm font-semibold">Message (optional)<textarea className={`${inputClass} py-2`} name="message" maxLength={500} disabled={create.isSuccess} /></label>{create.error && <p className="text-red-700" role="alert">{create.error.message}</p>}{create.isSuccess ? <p role="status">Request sent. <Link className="underline" to="/requests">View my requests</Link></p> : <button className="min-h-11 rounded-lg bg-emerald-700 px-4 text-white" disabled={create.isPending}>Send request</button>}<button className="ml-2 min-h-11 px-3" disabled={create.isPending} onClick={() => setKind(null)} type="button">Close</button></form>}
  </div>
}

export function RequestsPage() {
  return <PageShell title="My requests"><RequestInbox /></PageShell>
}

export function RequestInbox({ storeId }: { storeId?: string }) {
  const { accessToken } = useAuth()
  const [page, setPage] = useState(0)
  const path = storeId ? `/owner/stores/${storeId}/requests` : '/me/requests'
  // ponytail: inbox polling only while open; add push delivery if offline alerts become necessary.
  const query = useQuery({ queryKey: ['requests', path, page], queryFn: () => apiRequest<{ content: StockRequest[]; totalElements: number }>(`${path}?page=${page}`, {}, accessToken!), refetchInterval: 30000 })
  return <section className="my-8"><h2 className="text-2xl font-bold">{storeId ? 'Customer requests' : 'Stock enquiries and reservations'}</h2><p className="mt-2 text-sm text-stone-600">This inbox refreshes every 30 seconds while open. Unanswered requests expire after 24 hours.</p>{query.isLoading && <p role="status">Loading requests…</p>}{query.error && <p role="alert" className="mt-3 text-red-700">{query.error.message}</p>}{query.data?.content.length === 0 && <p className="mt-4">No requests yet.</p>}<ul className="mt-4 grid gap-4">{query.data?.content.map(item => <RequestCard key={item.id} item={item} owner={Boolean(storeId)} />)}</ul><StorePagination page={page} size={20} total={query.data?.totalElements ?? 0} disabled={query.isFetching} onChange={setPage} /></section>
}

function RequestCard({ item, owner }: { item: StockRequest; owner: boolean }) {
  const { accessToken } = useAuth()
  const client = useQueryClient()
  const [response, setResponse] = useState('')
  const status = item.status
  const active = ['PENDING', 'CONFIRMED'].includes(status)
  const update = useMutation({ mutationFn: (next: string) => apiRequest(owner ? `/owner/requests/${item.id}` : `/requests/${item.id}/cancel`, { method: 'PATCH', body: JSON.stringify({ status: next, response }) }, accessToken!), onSettled: () => {
    for (const key of ['requests', 'owner-listings', 'owner-analytics', 'owner-freshness']) void client.invalidateQueries({ queryKey: [key] })
  } })
  const actions = item.kind === 'ENQUIRY' ? ['AVAILABLE', 'UNAVAILABLE'] : status === 'PENDING' ? ['CONFIRMED', 'DECLINED'] : ['FULFILLED', 'DECLINED']
  const labels: Record<string,string> = { AVAILABLE: 'Available', UNAVAILABLE: 'Unavailable', CONFIRMED: 'Confirm 2-hour hold', DECLINED: 'Decline', FULFILLED: 'Mark collected' }
  return <li className="rounded-xl border bg-white p-4"><h3 className="break-words font-bold">{item.productName} {item.variant} · {item.quantity} requested</h3><p className="mt-1 text-sm">{item.kind === 'ENQUIRY' ? 'Stock enquiry' : 'Reservation'} · {status}</p><Link className="text-emerald-800 underline" to={`/stores/${item.storeId}`}>{item.storeName}</Link>{owner && <p className="mt-2">Customer: {item.customerName}</p>}{item.message && <p className="mt-2 break-words">{item.message}</p>}{item.response && <p className="mt-2 break-words">Merchant reply: {item.response}</p>}{item.quotedAmount != null && <p className="mt-2">Confirmed unit price: {item.currency} {item.quotedAmount}</p>}{active && <p className="mt-2 text-sm">{status === 'CONFIRMED' ? 'Collect before' : 'Request expires'}: {new Date(item.expiresAt).toLocaleString()}</p>}{active && owner && <><label className="mt-3 block text-sm font-semibold">Reply (optional)<textarea className={`${inputClass} mt-1 py-2`} value={response} onChange={event => setResponse(event.target.value)} maxLength={500} /></label><div className="mt-3 flex flex-wrap gap-2">{actions.map(next => <button className="min-h-11 rounded-lg border px-4 font-semibold" key={next} disabled={update.isPending} onClick={() => update.mutate(next)} type="button">{labels[next]}</button>)}</div></>}{active && !owner && <button className="mt-3 min-h-11 rounded-lg border px-4" disabled={update.isPending} onClick={() => update.mutate('CANCELLED')} type="button">Cancel request</button>}{update.error && <p className="mt-3 text-red-700" role="alert">{update.error.message}</p>}</li>
}
