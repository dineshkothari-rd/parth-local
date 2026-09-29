import { createContext, useContext } from 'react'

export interface UserLocation {
  /** Human-readable display string, e.g. "Koramangala, Bengaluru" */
  displayName: string
  lat: number
  lng: number
  /** How the location was obtained */
  source: 'gps' | 'manual' | 'unknown'
}

interface LocationContextValue {
  location: UserLocation | null
  setLocation: (loc: UserLocation | null) => void
  /** Whether the location modal should be shown */
  showModal: boolean
  openModal: () => void
  closeModal: () => void
}

export const LocationContext = createContext<LocationContextValue>({
  location: null,
  setLocation: () => undefined,
  showModal: false,
  openModal: () => undefined,
  closeModal: () => undefined,
})

export function useLocation(): LocationContextValue {
  return useContext(LocationContext)
}
