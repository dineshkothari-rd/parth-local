import { apiRequest } from '../auth/api'

export type Store = {
  id: string
  version: number
  updatedAt: string
  name: string
  description: string | null
  phone: string
  timezone: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'
  approvalReason: string | null
  hours: { weekday: number; opensAt: string | null; closesAt: string | null; closed: boolean }[]
  location: {
    addressLine: string
    locality: string
    city: string
    state: string
    postalCode: string
    latitude: number
    longitude: number
  }
}

type Page<T> = { content: T[]; totalElements: number }

export type CreateStoreInput = {
  name: string
  description?: string
  phone: string
  timezone: string
  location: Store['location']
}

export type HourInput = { weekday: number; opensAt: string | null; closesAt: string | null; closed: boolean }
export type Listing = {
  id: string
  storeId: string
  variant: { id: string; productId: string; label: string; barcode: string | null }
  amount: number
  currency: string
  quantity: number | null
  availability: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN'
  freshness: string
  observedAt: string
  inventoryVersion: number
  priceVersion: number
}
export type CatalogSuggestion = {
  productId: string
  productName: string
  brand: string | null
  variantId: string
  variant: string
}
export type StoreAnalytics = {
  products: number
  available: number
  lowStock: number
  outOfStock: number
  searches: number
  storeViews: number
  directionsClicks: number
  since: string
}

export const listOwnedStores = (token: string, page = 0) =>
  apiRequest<Page<Store>>(`/owner/stores?page=${page}`, {}, token)

export const createStore = (token: string, input: CreateStoreInput) =>
  apiRequest<Store>('/owner/stores', { method: 'POST', body: JSON.stringify(input) }, token)

export const getOwnedStore = (token: string, id: string) => apiRequest<Store>(`/owner/stores/${id}`, {}, token)
export const updateStore = (token: string, id: string, input: CreateStoreInput) =>
  apiRequest<Store>(`/owner/stores/${id}`, { method: 'PATCH', body: JSON.stringify(input) }, token)
export const updateStoreHours = (token: string, id: string, hours: HourInput[]) =>
  apiRequest<Store>(`/owner/stores/${id}/hours`, { method: 'PUT', body: JSON.stringify({ hours }) }, token)
export const getStoreAnalytics = (token: string, id: string) =>
  apiRequest<StoreAnalytics>(`/owner/stores/${id}/analytics`, {}, token)
export const listStoreProducts = (token: string, id: string, page = 0, needsReview = false) =>
  apiRequest<Page<Listing>>(`/owner/stores/${id}/products?size=100&page=${page}&needsReview=${needsReview}`, {}, token)
export const getFreshness = (token: string, id: string) =>
  apiRequest<{ needsReview: number; total: number }>(`/owner/stores/${id}/freshness`, {}, token)
export const searchCatalog = (query: string) =>
  apiRequest<CatalogSuggestion[]>(`/search?${new URLSearchParams({ q: query, size: '20' })}`)
export const addStoreProduct = (token: string, storeId: string, input: {
  variantId: string; amount: number; currency: string; quantity: number | null; availability: Listing['availability']
}) => apiRequest<Listing>(`/owner/stores/${storeId}/products`, { method: 'POST', body: JSON.stringify(input) }, token)
export const updateInventory = (token: string, listing: Listing, quantity: number | null, availability: Listing['availability']) =>
  apiRequest<Listing>(`/owner/store-products/${listing.id}/inventory`, {
    method: 'PATCH', body: JSON.stringify({ quantity, availability, expectedVersion: listing.inventoryVersion }),
  }, token)
export const updatePrice = (token: string, listing: Listing, amount: number) =>
  apiRequest<Listing>(`/owner/store-products/${listing.id}/price`, {
    method: 'PATCH', body: JSON.stringify({ amount, currency: listing.currency, expectedVersion: listing.priceVersion }),
  }, token)
export const trackDirections = (storeId: string) =>
  apiRequest<void>(`/stores/${storeId}/directions`, { method: 'POST' })

export const listPendingStores = (token: string, page = 0) =>
  apiRequest<Page<Store>>(`/admin/stores?page=${page}`, {}, token)

export const decideStore = (token: string, id: string, decision: 'APPROVE' | 'REJECT', reason?: string) =>
  apiRequest<Store>(
    `/admin/stores/${id}/approval`,
    { method: 'PATCH', body: JSON.stringify({ decision, reason }) },
    token,
  )
