/**
 * Zero-cost geocoding for India.
 * Priority: 1) Offline city/PIN prefix database  2) OSM Nominatim (free, no key)
 */

export interface GeoLocation {
  lat: number
  lng: number
  displayName: string
}

// Offline database — major Indian cities + popular localities
const CITY_DB: Record<string, GeoLocation> = {
  // Metro cities
  mumbai: { lat: 19.076, lng: 72.8777, displayName: 'Mumbai, Maharashtra' },
  delhi: { lat: 28.6139, lng: 77.209, displayName: 'Delhi' },
  'new delhi': { lat: 28.6139, lng: 77.209, displayName: 'New Delhi' },
  bengaluru: { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka' },
  bangalore: { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka' },
  hyderabad: { lat: 17.385, lng: 78.4867, displayName: 'Hyderabad, Telangana' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, displayName: 'Ahmedabad, Gujarat' },
  chennai: { lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu' },
  kolkata: { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata, West Bengal' },
  surat: { lat: 21.1702, lng: 72.8311, displayName: 'Surat, Gujarat' },
  pune: { lat: 18.5204, lng: 73.8567, displayName: 'Pune, Maharashtra' },
  jaipur: { lat: 26.9124, lng: 75.7873, displayName: 'Jaipur, Rajasthan' },
  lucknow: { lat: 26.8467, lng: 80.9462, displayName: 'Lucknow, Uttar Pradesh' },
  kanpur: { lat: 26.4499, lng: 80.3319, displayName: 'Kanpur, Uttar Pradesh' },
  nagpur: { lat: 21.1458, lng: 79.0882, displayName: 'Nagpur, Maharashtra' },
  indore: { lat: 22.7196, lng: 75.8577, displayName: 'Indore, Madhya Pradesh' },
  thane: { lat: 19.2183, lng: 72.9781, displayName: 'Thane, Maharashtra' },
  bhopal: { lat: 23.2599, lng: 77.4126, displayName: 'Bhopal, Madhya Pradesh' },
  visakhapatnam: { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh' },
  vizag: { lat: 17.6868, lng: 83.2185, displayName: 'Visakhapatnam, Andhra Pradesh' },
  pimpri: { lat: 18.6279, lng: 73.7997, displayName: 'Pimpri-Chinchwad, Maharashtra' },
  patna: { lat: 25.5941, lng: 85.1376, displayName: 'Patna, Bihar' },
  vadodara: { lat: 22.3072, lng: 73.1812, displayName: 'Vadodara, Gujarat' },
  ludhiana: { lat: 30.901, lng: 75.8573, displayName: 'Ludhiana, Punjab' },
  agra: { lat: 27.1767, lng: 78.0081, displayName: 'Agra, Uttar Pradesh' },
  nashik: { lat: 19.9975, lng: 73.7898, displayName: 'Nashik, Maharashtra' },
  faridabad: { lat: 28.4089, lng: 77.3178, displayName: 'Faridabad, Haryana' },
  meerut: { lat: 28.9845, lng: 77.7064, displayName: 'Meerut, Uttar Pradesh' },
  rajkot: { lat: 22.3039, lng: 70.8022, displayName: 'Rajkot, Gujarat' },
  varanasi: { lat: 25.3176, lng: 82.9739, displayName: 'Varanasi, Uttar Pradesh' },
  srinagar: { lat: 34.0837, lng: 74.7973, displayName: 'Srinagar, J&K' },
  aurangabad: { lat: 19.8762, lng: 75.3433, displayName: 'Aurangabad, Maharashtra' },
  dhanbad: { lat: 23.7957, lng: 86.4304, displayName: 'Dhanbad, Jharkhand' },
  amritsar: { lat: 31.634, lng: 74.8723, displayName: 'Amritsar, Punjab' },
  'navi mumbai': { lat: 19.033, lng: 73.0297, displayName: 'Navi Mumbai, Maharashtra' },
  allahabad: { lat: 25.4358, lng: 81.8463, displayName: 'Prayagraj, Uttar Pradesh' },
  prayagraj: { lat: 25.4358, lng: 81.8463, displayName: 'Prayagraj, Uttar Pradesh' },
  ranchi: { lat: 23.3441, lng: 85.3096, displayName: 'Ranchi, Jharkhand' },
  coimbatore: { lat: 11.0168, lng: 76.9558, displayName: 'Coimbatore, Tamil Nadu' },
  jabalpur: { lat: 23.1815, lng: 79.9864, displayName: 'Jabalpur, Madhya Pradesh' },
  gwalior: { lat: 26.2183, lng: 78.1828, displayName: 'Gwalior, Madhya Pradesh' },
  vijayawada: { lat: 16.5062, lng: 80.648, displayName: 'Vijayawada, Andhra Pradesh' },
  madurai: { lat: 9.9252, lng: 78.1198, displayName: 'Madurai, Tamil Nadu' },
  raipur: { lat: 21.2514, lng: 81.6296, displayName: 'Raipur, Chhattisgarh' },
  kota: { lat: 25.2138, lng: 75.8648, displayName: 'Kota, Rajasthan' },
  chandigarh: { lat: 30.7333, lng: 76.7794, displayName: 'Chandigarh' },
  guwahati: { lat: 26.1445, lng: 91.7362, displayName: 'Guwahati, Assam' },
  solapur: { lat: 17.6805, lng: 75.9064, displayName: 'Solapur, Maharashtra' },
  hubli: { lat: 15.3647, lng: 75.124, displayName: 'Hubballi, Karnataka' },
  hubballi: { lat: 15.3647, lng: 75.124, displayName: 'Hubballi, Karnataka' },
  tiruchirappalli: { lat: 10.7905, lng: 78.7047, displayName: 'Tiruchirappalli, Tamil Nadu' },
  trichy: { lat: 10.7905, lng: 78.7047, displayName: 'Tiruchirappalli, Tamil Nadu' },
  bareilly: { lat: 28.367, lng: 79.4304, displayName: 'Bareilly, Uttar Pradesh' },
  moradabad: { lat: 28.8386, lng: 78.7733, displayName: 'Moradabad, Uttar Pradesh' },
  mysore: { lat: 12.2958, lng: 76.6394, displayName: 'Mysuru, Karnataka' },
  mysuru: { lat: 12.2958, lng: 76.6394, displayName: 'Mysuru, Karnataka' },
  gurgaon: { lat: 28.4595, lng: 77.0266, displayName: 'Gurugram, Haryana' },
  gurugram: { lat: 28.4595, lng: 77.0266, displayName: 'Gurugram, Haryana' },
  noida: { lat: 28.5355, lng: 77.391, displayName: 'Noida, Uttar Pradesh' },
  // Popular localities
  'bandra': { lat: 19.054, lng: 72.8405, displayName: 'Bandra, Mumbai' },
  'andheri': { lat: 19.1136, lng: 72.8697, displayName: 'Andheri, Mumbai' },
  'koramangala': { lat: 12.9352, lng: 77.6245, displayName: 'Koramangala, Bengaluru' },
  'indiranagar': { lat: 12.9784, lng: 77.6408, displayName: 'Indiranagar, Bengaluru' },
  'powai': { lat: 19.118, lng: 72.906, displayName: 'Powai, Mumbai' },
  'whitefield': { lat: 12.9698, lng: 77.7499, displayName: 'Whitefield, Bengaluru' },
  'hsr layout': { lat: 12.9081, lng: 77.6476, displayName: 'HSR Layout, Bengaluru' },
  'electronic city': { lat: 12.8399, lng: 77.6769, displayName: 'Electronic City, Bengaluru' },
  'cp': { lat: 28.6315, lng: 77.2167, displayName: 'Connaught Place, Delhi' },
  'connaught place': { lat: 28.6315, lng: 77.2167, displayName: 'Connaught Place, Delhi' },
  'lajpat nagar': { lat: 28.5678, lng: 77.2432, displayName: 'Lajpat Nagar, Delhi' },
  'saket': { lat: 28.5244, lng: 77.2066, displayName: 'Saket, Delhi' },
  'rohini': { lat: 28.7041, lng: 77.1025, displayName: 'Rohini, Delhi' },
  'dwarka': { lat: 28.5921, lng: 77.0460, displayName: 'Dwarka, Delhi' },
  'malviya nagar': { lat: 28.5302, lng: 77.1965, displayName: 'Malviya Nagar, Delhi' },
  'hauz khas': { lat: 28.5494, lng: 77.2001, displayName: 'Hauz Khas, Delhi' },
  'south ex': { lat: 28.5686, lng: 77.2218, displayName: 'South Extension, Delhi' },
  'juhu': { lat: 19.1075, lng: 72.8263, displayName: 'Juhu, Mumbai' },
  'dadar': { lat: 19.0178, lng: 72.8478, displayName: 'Dadar, Mumbai' },
  'worli': { lat: 18.9987, lng: 72.8183, displayName: 'Worli, Mumbai' },
  'lower parel': { lat: 18.9956, lng: 72.8256, displayName: 'Lower Parel, Mumbai' },
}

// PIN prefix → approximate city centre
const PIN_PREFIX_DB: Record<string, GeoLocation> = {
  '110': { lat: 28.6139, lng: 77.209, displayName: 'Delhi' },
  '111': { lat: 28.6139, lng: 77.209, displayName: 'Delhi' },
  '120': { lat: 28.4595, lng: 77.0266, displayName: 'Gurugram, Haryana' },
  '121': { lat: 28.4089, lng: 77.3178, displayName: 'Faridabad, Haryana' },
  '400': { lat: 19.076, lng: 72.8777, displayName: 'Mumbai, Maharashtra' },
  '401': { lat: 19.2183, lng: 72.9781, displayName: 'Thane, Maharashtra' },
  '411': { lat: 18.5204, lng: 73.8567, displayName: 'Pune, Maharashtra' },
  '500': { lat: 17.385, lng: 78.4867, displayName: 'Hyderabad, Telangana' },
  '560': { lat: 12.9716, lng: 77.5946, displayName: 'Bengaluru, Karnataka' },
  '600': { lat: 13.0827, lng: 80.2707, displayName: 'Chennai, Tamil Nadu' },
  '700': { lat: 22.5726, lng: 88.3639, displayName: 'Kolkata, West Bengal' },
  '201': { lat: 28.5355, lng: 77.391, displayName: 'Noida, Uttar Pradesh' },
  '226': { lat: 26.8467, lng: 80.9462, displayName: 'Lucknow, Uttar Pradesh' },
  '302': { lat: 26.9124, lng: 75.7873, displayName: 'Jaipur, Rajasthan' },
  '380': { lat: 23.0225, lng: 72.5714, displayName: 'Ahmedabad, Gujarat' },
  '440': { lat: 21.1458, lng: 79.0882, displayName: 'Nagpur, Maharashtra' },
  '452': { lat: 22.7196, lng: 75.8577, displayName: 'Indore, Madhya Pradesh' },
  '462': { lat: 23.2599, lng: 77.4126, displayName: 'Bhopal, Madhya Pradesh' },
  '800': { lat: 25.5941, lng: 85.1376, displayName: 'Patna, Bihar' },
}

function normaliseName(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Resolve from offline DB */
function resolveOffline(query: string): GeoLocation | null {
  const key = normaliseName(query)

  // Exact city name match
  if (CITY_DB[key]) return CITY_DB[key]

  // 6-digit PIN code
  if (/^\d{6}$/.test(key)) {
    const prefix3 = key.slice(0, 3)
    if (PIN_PREFIX_DB[prefix3]) return PIN_PREFIX_DB[prefix3]
  }

  // Partial / substring match
  for (const [cityKey, loc] of Object.entries(CITY_DB)) {
    if (cityKey.includes(key) || key.includes(cityKey)) return loc
  }

  return null
}

/** Resolve via OSM Nominatim (free, no API key) */
async function resolveNominatim(query: string): Promise<GeoLocation | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', India')}&format=json&limit=1&countrycodes=IN`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
    if (!data.length) return null
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    }
  } catch {
    return null
  }
}

/**
 * Main export — resolves any place name or PIN to lat/lng.
 * Always free; offline-first with Nominatim fallback.
 */
export async function geocode(query: string): Promise<GeoLocation | null> {
  const offline = resolveOffline(query)
  if (offline) return offline
  return resolveNominatim(query)
}

/** Synchronous offline-only resolution (for quick UI hints) */
export function geocodeSync(query: string): GeoLocation | null {
  return resolveOffline(query)
}
