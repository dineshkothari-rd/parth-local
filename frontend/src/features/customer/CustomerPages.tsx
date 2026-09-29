import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { trackDirections } from '../stores/api'
import { getNavigationUrl, getStoreOpenStatus, getWhatsAppUrl } from '../../shared/utils/formatters'
import { StatusBadge } from '../../shared/components/StatusBadge'
import {
  addFavorite,
  addReport,
  addReview,
  clearHistory,
  getFavorites,
  getHistory,
  getProduct,
  getStore,
  getStoreProducts,
  getStoreReviews,
  removeFavorite,
} from './api'

const inputClass = 'min-h-11 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3'
const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <Link className="flex items-center gap-1.5 font-extrabold text-emerald-800 transition hover:text-emerald-950" to="/">
        <span aria-hidden="true">←</span>
        <span>Walkit</span>
      </Link>
      {children}
    </main>
  )
}

function SaveButton({ type, targetId }: { type: 'PRODUCT' | 'STORE'; targetId: string }) {
  const { user, accessToken } = useAuth()
  const save = useMutation({ mutationFn: () => addFavorite(accessToken!, type, targetId) })
  if (!user?.roles.includes('CUSTOMER')) return null
  return (
    <div>
      <button
        className="min-h-11 rounded-xl border border-emerald-700 px-4 font-semibold text-emerald-800 transition hover:bg-emerald-50"
        disabled={save.isPending || save.isSuccess}
        onClick={() => save.mutate()}
        type="button"
      >
        {save.isSuccess ? '✓ Saved' : save.isPending ? 'Saving…' : 'Save'}
      </button>
      {save.error && <p className="mt-2 text-sm text-red-700" role="alert">{save.error.message}</p>}
    </div>
  )
}

export function ProductPage() {
  const id = useParams().id!
  const product = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) })
  return (
    <Shell>
      {product.isLoading && <p className="mt-8" role="status">Loading product…</p>}
      {product.error && <p className="mt-8 text-red-700" role="alert">{product.error.message}</p>}
      {product.data && (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{product.data.category}</p>
          <div className="mt-2 flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-extrabold text-stone-950 sm:text-4xl">{product.data.name}</h1>
              {product.data.brand && <p className="mt-1 text-base text-stone-600 font-medium">{product.data.brand}</p>}
            </div>
            <SaveButton type="PRODUCT" targetId={id} />
          </div>
          <h2 className="mt-8 text-lg font-bold text-stone-950">Available variants</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.data.variants.map((variant) => (
              <li className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-stone-800" key={variant.id}>
                {variant.label}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Link
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-700 px-6 font-bold text-white shadow-sm transition hover:bg-emerald-800"
              to={`/search?q=${encodeURIComponent(product.data.name)}`}
            >
              <span>🔍</span> Find in nearby stores
            </Link>
          </div>
        </section>
      )}
    </Shell>
  )
}

export function StorePage() {
  const id = useParams().id!
  const { user, accessToken } = useAuth()
  const store = useQuery({ queryKey: ['store', id], queryFn: () => getStore(id) })
  const products = useQuery({ queryKey: ['store-products', id], queryFn: () => getStoreProducts(id) })
  const reviews = useQuery({ queryKey: ['store-reviews', id], queryFn: () => getStoreReviews(id) })
  const review = useMutation({
    mutationFn: ({ rating, text }: { rating: number; text: string }) => addReview(accessToken!, id, rating, text),
  })
  const report = useMutation({
    mutationFn: ({ type, details, listingId }: { type: string; details: string; listingId?: string }) =>
      addReport(accessToken!, id, type, details, listingId),
  })

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    review.mutate({ rating: Number(data.get('rating')), text: String(data.get('text')) })
  }
  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    report.mutate({
      type: String(data.get('type')),
      details: String(data.get('details')),
      listingId: String(data.get('listingId')) || undefined,
    })
  }

  const openStatus = getStoreOpenStatus(store.data?.hours)
  const directionsUrl = store.data ? getNavigationUrl(store.data.location.latitude, store.data.location.longitude) : ''
  const whatsappUrl = store.data ? getWhatsAppUrl(store.data.phone, store.data.name) : ''

  return (
    <Shell>
      {store.isLoading && <p className="mt-8" role="status">Loading store…</p>}
      {store.error && <p className="mt-8 text-red-700" role="alert">{store.error.message}</p>}
      {store.data && (
        <>
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="min-w-0">
                <div className="mb-2">
                  <StatusBadge type="store-status" value={openStatus.label} subtext={openStatus.subtext} />
                </div>
                <h1 className="break-words text-3xl font-extrabold text-stone-950 sm:text-4xl">{store.data.name}</h1>
                <p className="mt-2 break-words text-stone-600">
                  📍 {store.data.location.addressLine}, {store.data.location.locality}, {store.data.location.city} {store.data.location.postalCode}
                </p>
              </div>
              <SaveButton type="STORE" targetId={id} />
            </div>
            {store.data.description && <p className="mt-4 text-stone-700">{store.data.description}</p>}
            {store.data.hours.length > 0 && (
              <details className="mt-5 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-stone-900">Weekly Opening Hours</summary>
                <ul className="mt-3 max-w-sm space-y-1.5 text-stone-600">
                  {store.data.hours.map((hour) => (
                    <li className="flex justify-between gap-4" key={hour.weekday}>
                      <span className="font-medium">{weekdays[hour.weekday - 1]}</span>
                      <span>{hour.closed ? 'Closed' : `${hour.opensAt?.slice(0, 5)} – ${hour.closesAt?.slice(0, 5)}`}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              <a
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-5 font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                href={directionsUrl}
                onClick={() => void trackDirections(id).catch(() => undefined)}
                rel="noreferrer"
                target="_blank"
              >
                <span>🗺️</span> Get directions
              </a>
              <a
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-5 font-semibold text-emerald-900 transition hover:bg-emerald-100"
                href={whatsappUrl}
                rel="noreferrer"
                target="_blank"
              >
                <span>💬</span> WhatsApp Store
              </a>
              <a
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-5 font-semibold text-stone-800 transition hover:bg-stone-50"
                href={`tel:${store.data.phone}`}
              >
                <span>📞</span> Call store
              </a>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-stone-950">Store Inventory</h2>
              <span className="text-sm font-semibold text-stone-500">{products.data?.length ?? 0} items</span>
            </div>
            {products.isLoading && <p className="mt-4" role="status">Loading products…</p>}
            {products.error && <p className="mt-4 text-red-700" role="alert">{products.error.message}</p>}
            {products.data?.length === 0 && <p className="mt-4 text-stone-600">No products listed yet.</p>}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {products.data?.map((item) => {
                const itemWaUrl = getWhatsAppUrl(store.data.phone, store.data.name, `${item.productName} ${item.variant}`)
                return (
                  <li className="flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition hover:shadow-sm" key={item.listingId}>
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link className="font-bold text-emerald-950 hover:text-emerald-700" to={`/products/${item.productId}`}>
                          {item.productName} <span className="font-normal text-stone-500">{item.variant}</span>
                        </Link>
                        <strong className="text-lg font-black text-stone-950">₹{item.amount}</strong>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <StatusBadge type="availability" value={item.availability} />
                      </div>
                    </div>
                    <div className="mt-3.5 flex items-center justify-between border-t border-stone-100 pt-3">
                      <span className="text-xs text-stone-500">In stock nearby</span>
                      <a
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                        href={itemWaUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        💬 Inquire on WhatsApp →
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="mt-8">
            <h2 className="text-2xl font-bold text-stone-950">Reviews</h2>
            {reviews.error && <p className="mt-4 text-red-700" role="alert">{reviews.error.message}</p>}
            {reviews.data?.length === 0 && <p className="mt-4 text-stone-600">No published reviews yet.</p>}
            <ul className="mt-4 space-y-3">
              {reviews.data?.map((item) => (
                <li className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs" key={item.id}>
                  <p aria-label={`${item.rating} out of 5 stars`} className="text-amber-500">
                    {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
                  </p>
                  <p className="mt-2 break-words text-stone-800">{item.text}</p>
                  <p className="mt-2 text-xs font-medium text-stone-500">{item.displayName}</p>
                </li>
              ))}
            </ul>
          </section>

          {user?.roles.includes('CUSTOMER') && (
            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <form className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5" onSubmit={submitReview}>
                <h2 className="text-xl font-bold text-stone-950">Review this store</h2>
                <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="rating">Rating</label>
                <select className={`${inputClass} mt-1`} defaultValue="5" id="rating" name="rating">
                  {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
                </select>
                <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="review-text">Review</label>
                <textarea className={`${inputClass} mt-1 min-h-28 py-3`} id="review-text" maxLength={1000} minLength={3} name="text" required />
                {review.error && <p className="mt-3 text-red-700" role="alert">{review.error.message}</p>}
                {review.isSuccess && <p className="mt-3 text-emerald-800" role="status">Review submitted for moderation.</p>}
                <button className="mt-4 min-h-11 w-full rounded-xl bg-emerald-700 px-4 font-semibold text-white shadow-sm hover:bg-emerald-800" disabled={review.isPending}>Submit review</button>
              </form>

              <form className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:p-5" onSubmit={submitReport}>
                <h2 className="text-xl font-bold text-stone-950">Report incorrect information</h2>
                <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="report-type">Issue</label>
                <select className={`${inputClass} mt-1`} id="report-type" name="type">
                  <option value="PRODUCT_UNAVAILABLE">Product unavailable</option>
                  <option value="WRONG_PRICE">Wrong price</option>
                  <option value="STORE_CLOSED">Store closed</option>
                  <option value="WRONG_ADDRESS">Wrong address</option>
                  <option value="INCORRECT_STORE_INFORMATION">Other store information</option>
                </select>
                {Boolean(products.data?.length) && (
                  <>
                    <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="report-listing">Product (optional)</label>
                    <select className={`${inputClass} mt-1`} id="report-listing" name="listingId">
                      <option value="">Store-wide issue</option>
                      {products.data?.map((item) => (
                        <option key={item.listingId} value={item.listingId}>{item.productName} {item.variant}</option>
                      ))}
                    </select>
                  </>
                )}
                <label className="mt-4 block text-sm font-semibold text-stone-700" htmlFor="report-details">Details (optional)</label>
                <textarea className={`${inputClass} mt-1 min-h-28 py-3`} id="report-details" maxLength={1000} name="details" />
                {report.error && <p className="mt-3 text-red-700" role="alert">{report.error.message}</p>}
                {report.isSuccess && <p className="mt-3 text-emerald-800" role="status">Report submitted.</p>}
                <button className="mt-4 min-h-11 w-full rounded-xl border border-emerald-700 px-4 font-semibold text-emerald-800 hover:bg-emerald-50" disabled={report.isPending}>Send report</button>
              </form>
            </section>
          )}
        </>
      )}
    </Shell>
  )
}

export function SavedPage() {
  const { accessToken } = useAuth()
  const token = accessToken!
  const queryClient = useQueryClient()
  const favorites = useQuery({ queryKey: ['favorites'], queryFn: () => getFavorites(token) })
  const history = useQuery({ queryKey: ['search-history'], queryFn: () => getHistory(token) })
  const remove = useMutation({
    mutationFn: (id: string) => removeFavorite(token, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })
  const clear = useMutation({
    mutationFn: () => clearHistory(token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['search-history'] }),
  })
  return (
    <Shell>
      <h1 className="mt-8 text-3xl font-extrabold text-stone-950 sm:text-4xl">Saved and recent</h1>
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold text-stone-950">Favorites</h2>
          {favorites.isLoading && <p className="mt-4" role="status">Loading favorites…</p>}
          {favorites.data?.length === 0 && <p className="mt-4 text-stone-600">Nothing saved yet.</p>}
          <ul className="mt-4 space-y-3">
            {favorites.data?.map((item) => (
              <li className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs" key={item.id}>
                <div className="min-w-0">
                  <Link
                    className="break-words font-bold text-emerald-950 hover:text-emerald-700"
                    to={item.type === 'PRODUCT' ? `/products/${item.targetId}` : `/stores/${item.targetId}`}
                  >
                    {item.name}
                  </Link>
                  {item.subtitle && <p className="mt-1 break-words text-sm text-stone-600">{item.subtitle}</p>}
                </div>
                <button
                  className="shrink-0 text-sm font-semibold text-red-700 hover:text-red-900"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.id)}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-stone-950">Recent searches</h2>
            {Boolean(history.data?.length) && (
              <button
                className="text-sm font-semibold text-red-700 hover:text-red-900"
                disabled={clear.isPending}
                onClick={() => clear.mutate()}
                type="button"
              >
                Clear all
              </button>
            )}
          </div>
          {history.isLoading && <p className="mt-4" role="status">Loading history…</p>}
          {history.data?.length === 0 && <p className="mt-4 text-stone-600">No recent searches.</p>}
          <ul className="mt-4 space-y-2">
            {history.data?.map((item) => (
              <li key={item.id}>
                <Link
                  className="block min-h-11 rounded-xl border border-stone-200 bg-white px-4 py-3 font-semibold text-emerald-950 shadow-xs transition hover:border-emerald-600 hover:bg-emerald-50"
                  to={`/search?q=${encodeURIComponent(item.query)}`}
                >
                  🔍 {item.query}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  )
}
