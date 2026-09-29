/**
 * Natural language query parser for NearKart search.
 *
 * Handles:
 *  - "near me" / Hindi "aas paas" / "ke paas" → sets nearMe flag
 *  - "in [location]" / "at [location]" / "near [location]" → extracts location
 *  - 6-digit PIN codes embedded in query
 *  - Strips location tokens from product query for cleaner search
 */

export interface ParsedQuery {
  /** Cleaned product search term */
  product: string
  /** True if user wants results near current GPS location */
  nearMe: boolean
  /** Explicit locality / city / PIN from the query (may be empty) */
  location: string
}

const NEAR_ME_PATTERNS = [
  /\bnear\s*me\b/i,
  /\baas\s*paas\b/i,
  /\baas-paas\b/i,
  /\bke\s*paas\b/i,
  /\bnear\s+by\b/i,
  /\bnearby\b/i,
  /\bmere\s+paas\b/i,
  /\bpas\b/i,
]

const LOCATION_PATTERNS = [
  /\bin\s+([a-z\s]{2,40}?)(?:\s*$|\s+ke?\b|\s+mein\b)/i,
  /\bat\s+([a-z\s]{2,40}?)(?:\s*$)/i,
  /\bnear\s+([a-z][a-z\s]{1,39}?)(?:\s*$)/i,
  /\b(\d{6})\b/, // 6-digit PIN code
]

export function parseQuery(raw: string): ParsedQuery {
  let text = raw.trim()
  let nearMe = false
  let location = ''

  // 1. Detect "near me" variants
  for (const pattern of NEAR_ME_PATTERNS) {
    if (pattern.test(text)) {
      nearMe = true
      text = text.replace(pattern, '').trim()
      break
    }
  }

  // 2. Extract explicit location
  for (const pattern of LOCATION_PATTERNS) {
    const match = pattern.exec(text)
    if (match) {
      location = match[1].trim()
      text = text.replace(match[0], '').trim()
      break
    }
  }

  // 3. Clean up remaining text
  const product = text.replace(/\s{2,}/g, ' ').trim()

  return { product, nearMe, location }
}
