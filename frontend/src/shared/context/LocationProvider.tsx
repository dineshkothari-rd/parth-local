import { useState, useCallback, type ReactNode } from 'react'
import { LocationContext, type UserLocation } from './LocationContext'
import { geocode, geocodeSync } from '../services/geocoding'

interface Props {
  children: ReactNode
}

const QUICK_CITIES = [
  'Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Noida',
]

export function LocationProvider({ children }: Props) {
  const [location, setLocationState] = useState<UserLocation | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')

  const setLocation = useCallback((loc: UserLocation | null) => {
    setLocationState(loc)
  }, [])

  const openModal = useCallback(() => setShowModal(true), [])
  const closeModal = useCallback(() => setShowModal(false), [])

  // Detect GPS location
  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS not supported in this browser.')
      return
    }
    setSearching(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          displayName: `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`,
          source: 'gps',
        })
        setSearching(false)
        setShowModal(false)
      },
      () => {
        setError('Could not get your location. Please search manually.')
        setSearching(false)
      },
      { timeout: 10000 },
    )
  }, [setLocation])

  // Search by name / PIN
  const handleSearch = useCallback(async () => {
    if (!searchInput.trim()) return
    setSearching(true)
    setError('')

    // Try offline first (sync)
    const offline = geocodeSync(searchInput)
    if (offline) {
      setLocation({ ...offline, source: 'manual' })
      setSearching(false)
      setShowModal(false)
      return
    }

    // Fall back to Nominatim
    const result = await geocode(searchInput)
    if (result) {
      setLocation({ ...result, source: 'manual' })
      setShowModal(false)
    } else {
      setError(`Could not find "${searchInput}". Try a nearby city or PIN code.`)
    }
    setSearching(false)
  }, [searchInput, setLocation])

  // Quick city pill
  const selectCity = useCallback(
    (city: string) => {
      const result = geocodeSync(city)
      if (result) {
        setLocation({ ...result, source: 'manual' })
        setShowModal(false)
      }
    },
    [setLocation],
  )

  return (
    <LocationContext.Provider value={{ location, setLocation, showModal, openModal, closeModal }}>
      {children}

      {/* Location Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Set your location"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <h2 className="text-lg font-bold text-stone-950">Where are you?</h2>
            <p className="mt-1 text-sm text-stone-500">
              Set your location to find stores and prices near you.
            </p>

            {/* GPS button */}
            <button
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-3 font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
              onClick={detectGPS}
              disabled={searching}
              type="button"
            >
              📍 Use my current location
            </button>

            <div className="my-4 flex items-center gap-2">
              <hr className="flex-1 border-stone-200" />
              <span className="text-xs text-stone-400">or search</span>
              <hr className="flex-1 border-stone-200" />
            </div>

            {/* Manual search */}
            <div className="flex gap-2">
              <input
                className="min-h-11 flex-1 rounded-xl border border-stone-300 px-3 text-stone-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
                placeholder="City name or PIN code"
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value) }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleSearch() }}
                type="search"
                autoFocus
              />
              <button
                className="min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                onClick={() => void handleSearch()}
                disabled={searching || !searchInput.trim()}
                type="button"
              >
                {searching ? '…' : 'Go'}
              </button>
            </div>

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {/* Quick city pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_CITIES.map((city) => (
                <button
                  key={city}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm font-medium text-stone-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() => selectCity(city)}
                  type="button"
                >
                  {city}
                </button>
              ))}
            </div>

            <button
              className="mt-5 w-full text-sm text-stone-400 hover:text-stone-600"
              onClick={closeModal}
              type="button"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </LocationContext.Provider>
  )
}
