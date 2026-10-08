import { apiRequest } from '../auth/api'

export type NearbyOffer = {
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

export type OfferPage = { content: NearbyOffer[]; totalElements: number }
export const nearbySearch = (q: string, latitude: number, longitude: number, token?: string,
  options: { page: number; radiusKm: number; sort: string; inStockOnly: boolean } = { page: 0, radiusKm: 5, sort: 'RECOMMENDED', inStockOnly: false }) =>
  apiRequest<OfferPage>(
    `/search/nearby?${new URLSearchParams({ q, latitude: String(latitude), longitude: String(longitude),
      page: String(options.page), radiusKm: String(options.radiusKm), sort: options.sort, inStockOnly: String(options.inStockOnly) })}`,
    {}, token,
  )
