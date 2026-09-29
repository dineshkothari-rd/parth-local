import { describe, it, expect } from 'vitest'
import { parseQuery } from './queryParser'

describe('parseQuery — near me variants', () => {
  it('detects English "near me"', () => {
    const result = parseQuery('milk near me')
    expect(result.nearMe).toBe(true)
    expect(result.product).toBe('milk')
  })

  it('detects Hindi "aas paas"', () => {
    const result = parseQuery('doodh aas paas')
    expect(result.nearMe).toBe(true)
    expect(result.product).toBe('doodh')
  })

  it('detects "ke paas"', () => {
    const result = parseQuery('atta ke paas')
    expect(result.nearMe).toBe(true)
    expect(result.product).toBe('atta')
  })
})

describe('parseQuery — location extraction', () => {
  it('extracts "in [city]" location', () => {
    const result = parseQuery('rice in Koramangala')
    expect(result.location.toLowerCase()).toContain('koramangala')
    expect(result.product.toLowerCase()).toContain('rice')
  })

  it('extracts 6-digit PIN code as location', () => {
    const result = parseQuery('sugar 560001')
    expect(result.location).toBe('560001')
    expect(result.product).toContain('sugar')
  })

  it('returns empty location when none given', () => {
    const result = parseQuery('mustard oil')
    expect(result.location).toBe('')
    expect(result.product).toBe('mustard oil')
    expect(result.nearMe).toBe(false)
  })
})
