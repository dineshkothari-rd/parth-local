import { describe, it, expect } from 'vitest'
import { geocodeSync, geocode } from './geocoding'

describe('geocodeSync — offline resolution', () => {
  it('resolves major city by name (exact)', () => {
    const result = geocodeSync('mumbai')
    expect(result).not.toBeNull()
    expect(result?.displayName).toContain('Mumbai')
    expect(result?.lat).toBeCloseTo(19.076, 1)
  })

  it('resolves alternate spellings (bangalore → bengaluru)', () => {
    const result = geocodeSync('bangalore')
    expect(result).not.toBeNull()
    expect(result?.displayName).toContain('Bengaluru')
  })

  it('resolves a well-known locality (koramangala)', () => {
    const result = geocodeSync('koramangala')
    expect(result).not.toBeNull()
    expect(result?.displayName).toContain('Koramangala')
  })

  it('resolves a 6-digit PIN code via prefix', () => {
    const result = geocodeSync('560001')
    expect(result).not.toBeNull()
    expect(result?.displayName).toContain('Bengaluru')
  })

  it('returns null for unknown location', () => {
    const result = geocodeSync('xyzunknownplace99999')
    expect(result).toBeNull()
  })

  it('is case-insensitive', () => {
    const lower = geocodeSync('delhi')
    const upper = geocodeSync('DELHI')
    const mixed = geocodeSync('Delhi')
    expect(lower?.lat).toBe(upper?.lat)
    expect(lower?.lat).toBe(mixed?.lat)
  })
})

describe('geocode — async (offline path)', () => {
  it('resolves sync cities immediately without network', async () => {
    const result = await geocode('pune')
    expect(result).not.toBeNull()
    expect(result?.displayName).toContain('Pune')
  })
})
