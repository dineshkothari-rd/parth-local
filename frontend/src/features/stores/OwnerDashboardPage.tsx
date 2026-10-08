import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { InventoryImport } from './InventoryImport'
import { RequestInbox } from '../requests/Requests'
import {
  addStoreProduct,
  getOwnedStore,
  getFreshness,
  getStoreAnalytics,
  listStoreProducts,
  searchCatalog,
  updateInventory,
  updatePrice,
  updateStore,
  updateStoreHours,
  type CatalogSuggestion,
  type HourInput,
  type Listing,
  type Store,
} from './api'
import { inputClass, PageShell, StorePagination } from './StorePages'

export function OwnerDashboardPage() {
  const [page, setPage] = useState(0)
  const [needsReview, setNeedsReview] = useState(false)
  const storeId = useParams().id!
  const { accessToken } = useAuth()
  const token = accessToken!
  const store = useQuery({ queryKey: ['owner-store', storeId], queryFn: () => getOwnedStore(token, storeId) })
  const listings = useQuery({ queryKey: ['owner-listings', storeId, page, needsReview], queryFn: () => listStoreProducts(token, storeId, page, needsReview) })
  const freshness = useQuery({ queryKey: ['owner-freshness', storeId], queryFn: () => getFreshness(token, storeId), refetchInterval: 60000 })
  const analytics = useQuery({ queryKey: ['owner-analytics', storeId], queryFn: () => getStoreAnalytics(token, storeId) })

  return <PageShell title={store.data?.name ?? 'Store dashboard'}>
    {store.isLoading && <p className="mt-8" role="status">Loading dashboard…</p>}
    {store.error && <p className="mt-8 text-red-700" role="alert">{store.error.message}</p>}
    {store.data && <>
      <p className="mt-2 text-sm font-semibold text-emerald-800">{store.data.status}</p>
      <Analytics data={analytics.data} loading={analytics.isLoading} />
      <InventoryImport key={`import-${storeId}`} token={token} storeId={storeId} />
      <section className="mt-6 rounded-xl border p-4"><h2 className="font-bold">Stock review reminders</h2>{freshness.data && <p className="mt-2">{freshness.data.needsReview} of {freshness.data.total} items need a stock check.</p>}{freshness.error && <p role="alert">{freshness.error.message}</p>}<label className="mt-3 flex min-h-11 items-center gap-2"><input type="checkbox" checked={needsReview} onChange={event => { setNeedsReview(event.target.checked); setPage(0) }} />Show only items needing review</label><p className="text-sm text-stone-600">Check the actual stock, select those items below and save to confirm availability.</p></section>
      <Inventory key={`${storeId}-${page}-${needsReview}-${listings.dataUpdatedAt}`} token={token} storeId={storeId} listings={listings.data?.content} loading={listings.isLoading} error={listings.error} />
      <StorePagination page={page} size={100} total={listings.data?.totalElements ?? 0} disabled={listings.isFetching} onChange={setPage} />
      {analytics.error && <p className="mt-4 text-red-700" role="alert">{analytics.error.message}</p>}
      <AddProduct token={token} storeId={storeId} />
      <RequestInbox key={`requests-${storeId}`} storeId={storeId} />
      <Profile token={token} store={store.data} />
      <Hours key={`${store.data.version}-${store.data.updatedAt}`} token={token} store={store.data} />
    </>}
  </PageShell>
}

function Analytics({ data, loading }: { data?: Awaited<ReturnType<typeof getStoreAnalytics>>; loading: boolean }) {
  if (loading) return <p className="mt-8" role="status">Loading analytics…</p>
  if (!data) return null
  const metrics = [
    ['Products', data.products], ['Available', data.available], ['Low stock', data.lowStock],
    ['Out of stock', data.outOfStock], ['Searches', data.searches], ['Store views', data.storeViews],
    ['Directions', data.directionsClicks],
  ]
  return <section className="mt-8" aria-labelledby="analytics-heading"><div className="flex flex-wrap items-end justify-between gap-2"><h2 className="text-2xl font-bold" id="analytics-heading">Last 30 days</h2><span className="text-sm text-stone-500">Since {new Date(data.since).toLocaleDateString()}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.map(([label, value]) => <div className="rounded-xl border bg-white p-4" key={label}><dt className="text-sm text-stone-600">{label}</dt><dd className="mt-1 text-2xl font-bold">{value}</dd></div>)}</dl></section>
}

function Inventory({ token, storeId, listings, loading, error }: { token: string; storeId: string; listings?: Listing[]; loading: boolean; error: Error | null }) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const save = useMutation({
    mutationFn: async (updates: { listing: Listing; quantity: number | null; availability: Listing['availability']; amount: number }[]) => {
      for (const update of updates) {
        const current = await updateInventory(token, update.listing, update.quantity, update.availability)
        if (update.amount !== Number(current.amount)) await updatePrice(token, current, update.amount)
      }
    },
    onSuccess: () => setSelected(new Set()),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner-listings', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['owner-analytics', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['owner-freshness', storeId] })
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    save.mutate((listings ?? []).filter((item) => selected.has(item.id)).map((listing) => ({
      listing,
      quantity: data.get(`quantity-${listing.id}`) === '' ? null : Number(data.get(`quantity-${listing.id}`)),
      availability: String(data.get(`availability-${listing.id}`)) as Listing['availability'],
      amount: Number(data.get(`amount-${listing.id}`)),
    })))
  }

  return <section className="mt-10" aria-labelledby="inventory-heading"><h2 className="text-2xl font-bold" id="inventory-heading">Inventory and prices</h2>{loading && <p className="mt-4" role="status">Loading inventory…</p>}{error && <p className="mt-4 text-red-700" role="alert">{error.message}</p>}{listings?.length === 0 && <p className="mt-4 text-stone-600">No products listed yet.</p>}{Boolean(listings?.length) && <form className="mt-4" onSubmit={submit}><ul className="grid gap-3">{listings?.map((listing) => <li className="rounded-xl border bg-white p-4" key={listing.id}><div className="flex min-w-0 items-start gap-3"><input aria-label={`Select ${listing.variant.label}`} checked={selected.has(listing.id)} className="mt-1 size-5 shrink-0" onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(listing.id); else next.delete(listing.id); return next })} type="checkbox"/><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{listing.variant.label}</h3><p className="mt-1 text-xs font-semibold text-stone-500">{listing.freshness.replaceAll('_', ' ')}</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-sm font-semibold">Quantity<input className={`${inputClass} mt-1`} defaultValue={listing.quantity ?? ''} min="0" name={`quantity-${listing.id}`} type="number" /></label><label className="text-sm font-semibold">Availability<select className={`${inputClass} mt-1`} defaultValue={listing.availability} name={`availability-${listing.id}`}><option value="AVAILABLE">Available</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option><option value="UNKNOWN">Unknown</option></select></label><label className="text-sm font-semibold">Price (₹)<input className={`${inputClass} mt-1`} defaultValue={listing.amount} min="0.01" name={`amount-${listing.id}`} required step="0.01" type="number" /></label></div></div></div></li>)}</ul>{save.error && <p className="mt-3 text-red-700" role="alert">{save.error.message}</p>}{save.isSuccess && <p className="mt-3 text-emerald-800" role="status">Selected products updated.</p>}<button className="mt-4 min-h-11 w-full rounded-xl bg-emerald-700 px-5 font-semibold text-white sm:w-auto" disabled={selected.size === 0 || save.isPending}>{save.isPending ? 'Saving…' : `Save selected (${selected.size})`}</button></form>}</section>
}

function AddProduct({ token, storeId }: { token: string; storeId: string }) {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CatalogSuggestion | null>(null)
  const results = useQuery({ queryKey: ['catalog-search', query], queryFn: () => searchCatalog(query), enabled: query.length >= 2 })
  const add = useMutation({
    mutationFn: (input: Parameters<typeof addStoreProduct>[2]) => addStoreProduct(token, storeId, input),
    onSuccess: () => {
      setSelected(null); setDraft(''); setQuery('')
      void queryClient.invalidateQueries({ queryKey: ['owner-listings', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['owner-analytics', storeId] })
      void queryClient.invalidateQueries({ queryKey: ['owner-freshness', storeId] })
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return
    const data = new FormData(event.currentTarget)
    add.mutate({ variantId: selected.variantId, amount: Number(data.get('amount')), currency: 'INR', quantity: data.get('quantity') === '' ? null : Number(data.get('quantity')), availability: String(data.get('availability')) as Listing['availability'] })
  }
  return <section className="mt-10" aria-labelledby="add-product-heading"><h2 className="text-2xl font-bold" id="add-product-heading">Add a product</h2><form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setQuery(draft.trim()); setSelected(null) }} role="search"><input aria-label="Search catalog" className={inputClass} minLength={2} onChange={(event) => setDraft(event.target.value)} placeholder="Search product catalog" required value={draft}/><button className="min-h-11 rounded-lg border px-5 font-semibold">Search</button></form>{results.isLoading && <p className="mt-3" role="status">Searching catalog…</p>}{results.data && !selected && <ul className="mt-3 grid gap-2 sm:grid-cols-2">{results.data.map((item) => <li key={item.variantId}><button className="min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-left" onClick={() => setSelected(item)} type="button"><strong>{item.productName}</strong> {item.variant}{item.brand && <span className="block text-sm text-stone-500">{item.brand}</span>}</button></li>)}</ul>}{selected && <form className="mt-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-3" onSubmit={submit}><p className="font-bold sm:col-span-3">{selected.productName} {selected.variant}<span className="mt-1 block break-all text-xs font-normal text-stone-600">CSV variant ID: {selected.variantId}</span></p><label className="text-sm font-semibold">Price (₹)<input className={`${inputClass} mt-1`} min="0.01" name="amount" required step="0.01" type="number" /></label><label className="text-sm font-semibold">Quantity<input className={`${inputClass} mt-1`} min="0" name="quantity" type="number" /></label><label className="text-sm font-semibold">Availability<select className={`${inputClass} mt-1`} defaultValue="AVAILABLE" name="availability"><option value="AVAILABLE">Available</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option><option value="UNKNOWN">Unknown</option></select></label>{add.error && <p className="text-red-700 sm:col-span-3" role="alert">{add.error.message}</p>}<div className="grid grid-cols-2 gap-2 sm:col-span-3 sm:flex"><button className="min-h-11 rounded-lg bg-emerald-700 px-5 font-semibold text-white" disabled={add.isPending}>Add product</button><button className="min-h-11 rounded-lg border px-5 font-semibold" onClick={() => setSelected(null)} type="button">Cancel</button></div></form>}</section>
}

function Profile({ token, store }: { token: string; store: Store }) {
  const queryClient = useQueryClient()
  const save = useMutation({ mutationFn: (input: Parameters<typeof updateStore>[2]) => updateStore(token, store.id, input), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['owner-store', store.id] }) })
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); save.mutate({ name: String(data.get('name')), description: String(data.get('description')), phone: String(data.get('phone')), timezone: store.timezone, location: { addressLine: String(data.get('addressLine')), locality: String(data.get('locality')), city: String(data.get('city')), state: String(data.get('state')), postalCode: String(data.get('postalCode')), latitude: Number(data.get('latitude')), longitude: Number(data.get('longitude')) } }) }
  return <section className="mt-10" aria-labelledby="profile-heading"><h2 className="text-2xl font-bold" id="profile-heading">Store profile</h2><form className="mt-4 grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-2" onSubmit={submit}><label className="text-sm font-semibold">Store name<input className={`${inputClass} mt-1`} defaultValue={store.name} maxLength={150} name="name" required /></label><label className="text-sm font-semibold">Phone<input className={`${inputClass} mt-1`} defaultValue={store.phone} name="phone" pattern="\+?[0-9]{10,15}" required /></label><label className="text-sm font-semibold sm:col-span-2">Description<textarea className={`${inputClass} mt-1 min-h-24 py-3`} defaultValue={store.description ?? ''} maxLength={1000} name="description" /></label><label className="text-sm font-semibold sm:col-span-2">Street address<input className={`${inputClass} mt-1`} defaultValue={store.location.addressLine} name="addressLine" required /></label><label className="text-sm font-semibold">Locality<input className={`${inputClass} mt-1`} defaultValue={store.location.locality} name="locality" required /></label><label className="text-sm font-semibold">City<input className={`${inputClass} mt-1`} defaultValue={store.location.city} name="city" required /></label><label className="text-sm font-semibold">State<input className={`${inputClass} mt-1`} defaultValue={store.location.state} name="state" required /></label><label className="text-sm font-semibold">PIN code<input className={`${inputClass} mt-1`} defaultValue={store.location.postalCode} name="postalCode" pattern="[1-9][0-9]{5}" required /></label><label className="text-sm font-semibold">Latitude<input className={`${inputClass} mt-1`} defaultValue={store.location.latitude} max="90" min="-90" name="latitude" required step="0.000001" type="number" /></label><label className="text-sm font-semibold">Longitude<input className={`${inputClass} mt-1`} defaultValue={store.location.longitude} max="180" min="-180" name="longitude" required step="0.000001" type="number" /></label>{save.error && <p className="text-red-700 sm:col-span-2" role="alert">{save.error.message}</p>}{save.isSuccess && <p className="text-emerald-800 sm:col-span-2" role="status">Profile updated.</p>}<button className="min-h-11 rounded-lg bg-emerald-700 px-5 font-semibold text-white sm:col-span-2" disabled={save.isPending}>Save profile</button></form></section>
}

function Hours({ token, store }: { token: string; store: Store }) {
  const queryClient = useQueryClient()
  const existing = new Map(store.hours.map((hour) => [hour.weekday, hour]))
  const [hours, setHours] = useState<HourInput[]>(Array.from({ length: 7 }, (_, index) => existing.get(index + 1) ?? { weekday: index + 1, opensAt: '09:00', closesAt: '21:00', closed: false }))
  const save = useMutation({ mutationFn: () => updateStoreHours(token, store.id, hours), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['owner-store', store.id] }) })
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  function change(index: number, patch: Partial<HourInput>) { setHours((current) => current.map((hour, itemIndex) => itemIndex === index ? { ...hour, ...patch } : hour)) }
  return <section className="my-10" aria-labelledby="hours-heading"><h2 className="text-2xl font-bold" id="hours-heading">Opening hours</h2><form className="mt-4 rounded-xl border bg-white p-4" onSubmit={(event) => { event.preventDefault(); save.mutate() }}><ul className="space-y-4">{hours.map((hour, index) => <li className="grid items-center gap-2 sm:grid-cols-[8rem_1fr_1fr_auto]" key={hour.weekday}><strong>{days[index]}</strong><input aria-label={`${days[index]} opening time`} className={inputClass} disabled={hour.closed} onChange={(event) => change(index, { opensAt: event.target.value })} type="time" value={hour.opensAt ?? ''}/><input aria-label={`${days[index]} closing time`} className={inputClass} disabled={hour.closed} onChange={(event) => change(index, { closesAt: event.target.value })} type="time" value={hour.closesAt ?? ''}/><label className="flex min-h-11 items-center gap-2"><input checked={hour.closed} className="size-5" onChange={(event) => change(index, { closed: event.target.checked, opensAt: event.target.checked ? null : '09:00', closesAt: event.target.checked ? null : '21:00' })} type="checkbox"/>Closed</label></li>)}</ul>{save.error && <p className="mt-3 text-red-700" role="alert">{save.error.message}</p>}{save.isSuccess && <p className="mt-3 text-emerald-800" role="status">Hours updated.</p>}<button className="mt-4 min-h-11 w-full rounded-lg bg-emerald-700 px-5 font-semibold text-white sm:w-auto" disabled={save.isPending}>Save hours</button></form></section>
}
