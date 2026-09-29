export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m away`
  }
  return `${(meters / 1000).toFixed(1)} km away`
}

export function formatWalkTime(meters: number): string {
  // Average human walking pace is ~80 meters per minute (4.8 km/h)
  const minutes = Math.max(1, Math.round(meters / 80))
  if (minutes < 60) {
    return `~${minutes} min walk`
  }
  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return remMinutes > 0 ? `~${hours}h ${remMinutes}m walk` : `~${hours}h walk`
}

export function getNavigationUrl(latitude: number, longitude: number): string {
  // Universal Google Maps turn-by-turn navigation deep link (works seamlessly in mobile and desktop browsers at $0 cost)
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

export function getWhatsAppUrl(rawPhone: string, storeName: string, productName?: string): string {
  // Clean phone number (remove spaces, dashes, symbols)
  let cleanPhone = rawPhone.replace(/\D/g, '')
  if (cleanPhone.length === 10) {
    // Add default India country code +91 if 10-digit number
    cleanPhone = `91${cleanPhone}`
  }
  const inquiryText = productName
    ? `Hello ${storeName}, I found "${productName}" on Walkit. Is it available in your store right now?`
    : `Hello ${storeName}, I found your store on Walkit. Are you open right now?`
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inquiryText)}`
}

export interface StoreHour {
  weekday: number // 1 = Monday, 7 = Sunday
  opensAt?: string | null
  closesAt?: string | null
  closed?: boolean
}

export interface StoreOpenStatus {
  isOpen: boolean
  label: string
  subtext?: string
  statusType: 'open' | 'closing-soon' | 'closed'
}

export function getStoreOpenStatus(hours?: StoreHour[], now = new Date()): StoreOpenStatus {
  if (!hours || hours.length === 0) {
    return { isOpen: true, label: 'Store hours unlisted', statusType: 'open' }
  }

  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  // DB weekday: 1 is Monday ... 7 is Sunday
  const jsDay = now.getDay()
  const todayWeekday = jsDay === 0 ? 7 : jsDay
  const todayHours = hours.find((h) => h.weekday === todayWeekday)

  if (!todayHours || todayHours.closed || !todayHours.opensAt || !todayHours.closesAt) {
    return { isOpen: false, label: 'Closed today', statusType: 'closed' }
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const [openH, openM] = todayHours.opensAt.split(':').map(Number)
  const [closeH, closeM] = todayHours.closesAt.split(':').map(Number)

  const openMinutes = openH * 60 + openM
  const closeMinutes = closeH * 60 + closeM

  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      label: 'Closed now',
      subtext: `Opens at ${formatTime(todayHours.opensAt)}`,
      statusType: 'closed',
    }
  }

  if (currentMinutes >= closeMinutes) {
    return {
      isOpen: false,
      label: 'Closed for the day',
      subtext: `Closed at ${formatTime(todayHours.closesAt)}`,
      statusType: 'closed',
    }
  }

  const remainingMinutes = closeMinutes - currentMinutes
  if (remainingMinutes <= 30) {
    return {
      isOpen: true,
      label: 'Closing soon',
      subtext: `Closes in ${remainingMinutes} min (${formatTime(todayHours.closesAt)})`,
      statusType: 'closing-soon',
    }
  }

  return {
    isOpen: true,
    label: 'Open now',
    subtext: `Closes at ${formatTime(todayHours.closesAt)}`,
    statusType: 'open',
  }
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = m < 10 ? `0${m}` : m
  return `${displayH}:${displayM} ${period}`
}
