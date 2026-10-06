import { apiRequest } from '../auth/api'

export type Offer = {
  productId: string
  productName: string
  brand: string | null
  variant: string
  storeId: string
  storeName: string
  amount: number
  currency: string
  availability: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
  freshness: 'FRESH' | 'RECENT' | 'POSSIBLY_STALE' | 'STALE'
  observedAt: string
  distanceMeters: number
  storeLatitude: number
  storeLongitude: number
  recommendation: { score: number; reason: string }
}

export const nearbySearch = (q: string, latitude: number, longitude: number, token?: string) =>
  apiRequest<{ content: Offer[] }>(
    `/search/nearby?${new URLSearchParams({ q, latitude: String(latitude), longitude: String(longitude) })}`,
    {},
    token,
  ).then((page) => page.content)
