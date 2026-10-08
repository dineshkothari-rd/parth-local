import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { createStore, decideStore, listOwnedStores, listPendingStores, type CreateStoreInput, type Store } from './api'

export const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-stone-300 px-3'

export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Link className="font-bold text-emerald-800" to="/account">← Account</Link>
      <h1 className="mt-6 break-words text-2xl font-bold sm:mt-8 sm:text-3xl">{title}</h1>
      {children}
    </main>
  )
}

export function OwnerStoresPage() {
  const { accessToken } = useAuth()
  const token = accessToken!
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const stores = useQuery({ queryKey: ['owner-stores', page], queryFn: () => listOwnedStores(token, page) })
  const create = useMutation({
    mutationFn: (input: CreateStoreInput) => createStore(token, input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['owner-stores'] }),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    create.mutate({
      name: String(data.get('name')),
      description: String(data.get('description')),
      phone: String(data.get('phone')),
      timezone: 'Asia/Kolkata',
      location: {
        addressLine: String(data.get('addressLine')),
        locality: String(data.get('locality')),
        city: String(data.get('city')),
        state: String(data.get('state')),
        postalCode: String(data.get('postalCode')),
        latitude: Number(data.get('latitude')),
        longitude: Number(data.get('longitude')),
      },
    })
  }

  return (
    <PageShell title="Your stores">
      <form className="mt-6 grid gap-3 rounded-2xl border bg-white p-4 sm:mt-8 sm:grid-cols-2 sm:p-5" onSubmit={submit}>
        <input aria-label="Store name" className={inputClass} name="name" placeholder="Store name" required maxLength={150} />
        <input aria-label="Phone" className={inputClass} name="phone" placeholder="Phone" required pattern="\+?[0-9]{10,15}" />
        <input aria-label="Description" className={`${inputClass} sm:col-span-2`} name="description" placeholder="Description (optional)" maxLength={1000} />
        <input aria-label="Street address" className={`${inputClass} sm:col-span-2`} name="addressLine" placeholder="Street address" required />
        <input aria-label="Locality" className={inputClass} name="locality" placeholder="Locality" required />
        <input aria-label="City" className={inputClass} name="city" placeholder="City" required />
        <input aria-label="State" className={inputClass} name="state" placeholder="State" required />
        <input aria-label="PIN code" className={inputClass} name="postalCode" placeholder="PIN code" required pattern="[1-9][0-9]{5}" />
        <input aria-label="Latitude" className={inputClass} name="latitude" placeholder="Latitude" required type="number" min="-90" max="90" step="0.000001" />
        <input aria-label="Longitude" className={inputClass} name="longitude" placeholder="Longitude" required type="number" min="-180" max="180" step="0.000001" />
        {create.error && <p className="text-red-700 sm:col-span-2" role="alert">{create.error.message}</p>}
        <button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white sm:col-span-2" disabled={create.isPending}>
          {create.isPending ? 'Submitting…' : 'Submit store for approval'}
        </button>
      </form>
      {stores.error && <p className="mt-6 text-red-700" role="alert">{stores.error.message}</p>}
      <StoreList stores={stores.data?.content} loading={stores.isLoading} actions={(id) => <Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 font-semibold text-white" to={`/owner/stores/${id}`}>Manage store</Link>} />
      <StorePagination page={page} size={20} total={stores.data?.totalElements ?? 0} disabled={stores.isFetching} onChange={setPage} />
    </PageShell>
  )
}

export function AdminStoresPage() {
  const { accessToken } = useAuth()
  const token = accessToken!
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const stores = useQuery({ queryKey: ['pending-stores', page], queryFn: () => listPendingStores(token, page) })
  const decide = useMutation({
    mutationFn: ({ id, decision, reason }: { id: string; decision: 'APPROVE' | 'REJECT'; reason?: string }) => decideStore(token, id, decision, reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['pending-stores'] }),
  })
  return (
    <PageShell title="Pending store approvals">
      <Link className="mt-4 inline-block underline" to="/admin">← Administration</Link>
      {stores.error && <p className="mt-4 text-red-700" role="alert">{stores.error.message}</p>}
      <StoreList stores={stores.data?.content} loading={stores.isLoading} actions={(id) => (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
          <button className="min-h-11 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white" disabled={decide.isPending} onClick={() => decide.mutate({ id, decision: 'APPROVE' })} type="button">Approve</button>
          <button className="min-h-11 rounded-lg border px-3 py-2 font-semibold" disabled={decide.isPending} onClick={() => {
            const reason = window.prompt('Why is this store being rejected?')?.trim()
            if (reason) decide.mutate({ id, decision: 'REJECT', reason })
          }} type="button">Reject</button>
        </div>
      )} />
      <StorePagination page={page} size={20} total={stores.data?.totalElements ?? 0} disabled={stores.isFetching || decide.isPending} onChange={setPage} />
      {decide.error && <p className="mt-4 text-red-700" role="alert">{decide.error.message}</p>}
    </PageShell>
  )
}

function StoreList({ stores, loading, actions }: { stores?: Store[]; loading: boolean; actions?: (id: string) => React.ReactNode }) {
  if (loading) return <p className="mt-8" role="status">Loading stores…</p>
  if (!stores?.length) return <p className="mt-8 text-stone-600">No stores found.</p>
  return <ul className="mt-6 space-y-3 sm:mt-8">{stores.map((store) => (
    <li className="rounded-xl border bg-white p-4 sm:p-5" key={store.id}>
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4"><h2 className="min-w-0 break-words text-lg font-bold sm:text-xl">{store.name}</h2><span className="shrink-0 text-sm font-semibold text-emerald-800">{store.status}</span></div>
      <p className="mt-2 break-words text-stone-600">{store.location.addressLine}, {store.location.city} {store.location.postalCode}</p>
      {actions?.(store.id)}
    </li>
  ))}</ul>
}

export function StorePagination({ page, size, total, disabled, onChange }: { page: number; size: number; total: number; disabled: boolean; onChange: (page: number) => void }) {
  return <nav aria-label="Record pages" className="mt-5 flex items-center gap-3">
    <button className="min-h-11 rounded-lg border px-4 disabled:opacity-50" disabled={disabled || page === 0} onClick={() => onChange(page - 1)} type="button">Previous</button>
    <span>Page {page + 1}</span>
    <button className="min-h-11 rounded-lg border px-4 disabled:opacity-50" disabled={disabled || (page + 1) * size >= total} onClick={() => onChange(page + 1)} type="button">Next</button>
  </nav>
}
