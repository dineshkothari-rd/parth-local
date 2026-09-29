import { useQuery } from '@tanstack/react-query'
import { useState, useMemo, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { nearbySearch, type NearbyOffer } from './api'
import { useAuth } from '../auth/AuthContext'
import { trackDirections } from '../stores/api'
import { formatDistance, formatWalkTime, getNavigationUrl, getWhatsAppUrl } from '../../shared/utils/formatters'
import { StatusBadge } from '../../shared/components/StatusBadge'

// Demo presets for zero-friction testing without manual coordinate typing
const LOCATION_PRESETS = [
  { name: 'Indiranagar, Bangalore', lat: 12.9784, lng: 77.6408 },
  { name: 'Koramangala, Bangalore', lat: 12.9352, lng: 77.6245 },
  { name: 'HSR Layout, Bangalore', lat: 12.9121, lng: 77.6446 },
  { name: 'Bandra West, Mumbai', lat: 19.0596, lng: 72.8295 },
  { name: 'Connaught Place, Delhi', lat: 28.6315, lng: 77.2167 },
]

export function SearchPage() {
  const { accessToken } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get('q')?.trim() ?? ''
  const latitude = Number(params.get('latitude'))
  const longitude = Number(params.get('longitude'))
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude) && params.has('latitude')

  const [locationError, setLocationError] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [maxDistanceMeters, setMaxDistanceMeters] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<'recommended' | 'price' | 'distance' | 'freshness'>('recommended')

  const offers = useQuery({
    queryKey: ['nearby-search', q, latitude, longitude],
    queryFn: () => nearbySearch(q, latitude, longitude, accessToken ?? undefined),
    enabled: q.length >= 2 && hasLocation,
  })

  function useMyLocation() {
    setLocationError('')
    setIsLocating(true)
    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser. Please select a preset location.')
      setIsLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsLocating(false)
        setParams({ q, latitude: String(coords.latitude), longitude: String(coords.longitude) })
      },
      (err) => {
        setIsLocating(false)
        setLocationError(`Location detection failed (${err.message}). Pick a location preset below or enter coordinates.`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  function setPresetLocation(presetLat: number, presetLng: number) {
    setLocationError('')
    setParams({ q, latitude: String(presetLat), longitude: String(presetLng) })
  }

  function setManualLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setParams({ q, latitude: String(data.get('latitude')), longitude: String(data.get('longitude')) })
  }

  // Filter & sort offers client-side for zero latency interaction
  const processedOffers = useMemo(() => {
    if (!offers.data) return []
    let list = [...offers.data]

    if (inStockOnly) {
      list = list.filter((item) => item.availability === 'AVAILABLE')
    }

    if (maxDistanceMeters !== null) {
      list = list.filter((item) => item.distanceMeters <= maxDistanceMeters)
    }

    if (sortBy === 'price') {
      list.sort((a, b) => Number(a.amount) - Number(b.amount))
    } else if (sortBy === 'distance') {
      list.sort((a, b) => a.distanceMeters - b.distanceMeters)
    } else if (sortBy === 'freshness') {
      list.sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
    }

    return list
  }, [offers.data, inStockOnly, maxDistanceMeters, sortBy])

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <Link className="flex items-center gap-2 text-2xl font-black tracking-tight text-emerald-800" to="/">
          NearKart
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            Hyperlocal
          </span>
        </Link>
        <Link className="text-sm font-semibold text-stone-600 hover:text-emerald-800" to="/">
          ← Back to Search
        </Link>
      </header>

      {/* Query Banner */}
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="break-words text-3xl font-extrabold text-stone-950 sm:text-4xl">
            Nearby results for “{q}”
          </h1>
          {hasLocation && (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-stone-600">
              <span className="size-2 rounded-full bg-emerald-600" />
              Searching near ({latitude.toFixed(4)}, {longitude.toFixed(4)})
              <button
                className="ml-2 font-semibold text-emerald-800 underline hover:text-emerald-950"
                onClick={() => setParams({ q })}
                type="button"
              >
                Change
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Location Picker Section (Shown if location not set) */}
      {!hasLocation && (
        <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-xl font-bold text-emerald-800">
              📍
            </span>
            <div>
              <h2 className="text-xl font-bold text-stone-950">Choose your location</h2>
              <p className="text-sm text-stone-600">
                To show stores you can walk to, we need your neighborhood location.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              disabled={isLocating}
              onClick={useMyLocation}
              type="button"
            >
              {isLocating ? 'Detecting GPS…' : '📍 Use My Current Location'}
            </button>
          </div>

          {/* Quick Location Presets */}
          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Or pick a popular hub:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {LOCATION_PRESETS.map((preset) => (
                <button
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm font-medium text-stone-800 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-900"
                  key={preset.name}
                  onClick={() => setPresetLocation(preset.lat, preset.lng)}
                  type="button"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Coordinate Form */}
          <details className="mt-5 text-sm text-stone-600">
            <summary className="cursor-pointer font-medium hover:text-emerald-800">
              Advanced: Enter custom coordinates
            </summary>
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={setManualLocation}>
              <input
                aria-label="Latitude"
                className="min-h-11 min-w-0 rounded-xl border border-stone-300 px-3 text-stone-900 shadow-sm"
                max="90"
                min="-90"
                name="latitude"
                placeholder="Latitude (e.g. 12.9784)"
                required
                step="any"
                type="number"
              />
              <input
                aria-label="Longitude"
                className="min-h-11 min-w-0 rounded-xl border border-stone-300 px-3 text-stone-900 shadow-sm"
                max="180"
                min="-180"
                name="longitude"
                placeholder="Longitude (e.g. 77.6408)"
                required
                step="any"
                type="number"
              />
              <button
                className="min-h-11 rounded-xl bg-stone-900 px-5 font-semibold text-white shadow-sm hover:bg-stone-800"
                type="submit"
              >
                Set
              </button>
            </form>
          </details>

          {locationError && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200" role="alert">
              {locationError}
            </p>
          )}
        </section>
      )}

      {/* Filter and Sort Toolbar (When location is active and results loaded) */}
      {hasLocation && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* In-Stock Filter Pill */}
            <button
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                inStockOnly
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              onClick={() => setInStockOnly(!inStockOnly)}
              type="button"
            >
              {inStockOnly ? '✓ In Stock Only' : 'Filter: In Stock Only'}
            </button>

            {/* Distance Filter Pills */}
            <div className="flex items-center rounded-lg bg-stone-100 p-0.5 text-xs font-medium text-stone-700">
              <button
                className={`rounded-md px-2.5 py-1 ${maxDistanceMeters === null ? 'bg-white font-bold text-stone-950 shadow-xs' : 'hover:text-stone-900'}`}
                onClick={() => setMaxDistanceMeters(null)}
                type="button"
              >
                All Distances
              </button>
              <button
                className={`rounded-md px-2.5 py-1 ${maxDistanceMeters === 1000 ? 'bg-white font-bold text-stone-950 shadow-xs' : 'hover:text-stone-900'}`}
                onClick={() => setMaxDistanceMeters(1000)}
                type="button"
              >
                &lt; 1 km
              </button>
              <button
                className={`rounded-md px-2.5 py-1 ${maxDistanceMeters === 3000 ? 'bg-white font-bold text-stone-950 shadow-xs' : 'hover:text-stone-900'}`}
                onClick={() => setMaxDistanceMeters(3000)}
                type="button"
              >
                &lt; 3 km
              </button>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <label className="font-semibold text-stone-600" htmlFor="sort-select">
              Sort by:
            </label>
            <select
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1 font-medium text-stone-800 shadow-xs focus:border-emerald-600 focus:outline-none"
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="recommended">Best Match (Recommended)</option>
              <option value="price">Lowest Price</option>
              <option value="distance">Nearest First</option>
              <option value="freshness">Recently Verified</option>
            </select>
          </div>
        </section>
      )}

      {/* Loading Skeleton / Status */}
      {offers.isLoading && (
        <div className="mt-8 space-y-4" role="status">
          <p className="font-medium text-stone-600">Finding nearby stores with live inventory…</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((n) => (
              <div className="h-44 animate-pulse rounded-2xl border border-stone-200 bg-white p-5" key={n} />
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {offers.error && (
        <p className="mt-8 rounded-xl bg-red-50 p-4 text-red-700 ring-1 ring-red-200" role="alert">
          {offers.error.message}
        </p>
      )}

      {/* No Results */}
      {hasLocation && !offers.isLoading && processedOffers.length === 0 && (
        <div className="mt-12 text-center">
          <span className="text-4xl">🔍</span>
          <h2 className="mt-3 text-xl font-bold text-stone-900">No stores found with this item nearby</h2>
          <p className="mt-2 text-sm text-stone-600">
            Try expanding your distance filter or searching for a general brand or colloquial term (e.g. “doodh”, “bread”, “maggi”).
          </p>
        </div>
      )}

      {/* Search Result Offer Cards */}
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {processedOffers.map((offer) => (
          <OfferCard
            key={`${offer.storeId}-${offer.productId}-${offer.variant}`}
            offer={offer}
          />
        ))}
      </ul>
    </main>
  )
}

function OfferCard({ offer }: { offer: NearbyOffer }) {
  const directionsUrl = getNavigationUrl(offer.storeLatitude, offer.storeLongitude)
  const whatsappUrl = getWhatsAppUrl('9876543210', offer.storeName, `${offer.productName} ${offer.variant}`)

  return (
    <li className="flex min-w-0 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div>
        {/* Header: Product Name + Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="break-words text-xl font-bold text-stone-900">
              <Link className="hover:text-emerald-800" to={`/products/${offer.productId}`}>
                {offer.productName}
              </Link>{' '}
              <span className="text-base font-normal text-stone-500">{offer.variant}</span>
            </h2>
            <Link
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-stone-700 hover:text-emerald-800"
              to={`/stores/${offer.storeId}`}
            >
              🏪 {offer.storeName}
            </Link>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-stone-950">₹{offer.amount}</p>
            <p className="text-xs text-stone-500">Local price</p>
          </div>
        </div>

        {/* Badges: Availability, Freshness & Distance */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <StatusBadge type="availability" value={offer.availability} />
          <StatusBadge type="freshness" value={offer.freshness} />
          <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-700">
            🚶 {formatWalkTime(offer.distanceMeters)} ({formatDistance(offer.distanceMeters)})
          </span>
        </div>

        {/* Recommendation Reason */}
        <p className="mt-3 text-xs font-medium text-emerald-800">
          ✨ {offer.recommendation.reason}
        </p>
      </div>

      {/* Action Buttons: Directions, WhatsApp, View Store */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-4">
        <a
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-2 text-center text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus:ring-2 focus:ring-emerald-500"
          href={directionsUrl}
          onClick={() => void trackDirections(offer.storeId).catch(() => undefined)}
          rel="noreferrer"
          target="_blank"
        >
          <span>🗺️</span> Navigate
        </a>
        <a
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-50 px-2 text-center text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
          href={whatsappUrl}
          rel="noreferrer"
          target="_blank"
        >
          <span>💬</span> WhatsApp
        </a>
        <Link
          className="flex min-h-10 items-center justify-center rounded-xl border border-stone-300 bg-white px-2 text-center text-xs font-bold text-stone-800 transition hover:bg-stone-50"
          to={`/stores/${offer.storeId}`}
        >
          Store details
        </Link>
      </div>
    </li>
  )
}
