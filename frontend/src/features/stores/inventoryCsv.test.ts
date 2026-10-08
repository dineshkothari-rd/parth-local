import { describe, expect, it } from 'vitest'
import { csvHeader, inventoryCsv, parseInventoryCsv } from './inventoryCsv'

const id = '12345678-1234-1234-1234-123456789abc'
describe('inventory CSV', () => {
  it('reads spreadsheet BOM, quoted values, CRLF and blank quantity/versions', () => {
    expect(parseInventoryCsv(`\uFEFF${csvHeader}\r\n"${id}",12.50,,UNKNOWN,,\r\n`)).toEqual([{ variantId: id, amount: 12.5, quantity: null, availability: 'UNKNOWN', inventoryVersion: null, priceVersion: null }])
  })
  it('rejects broken quoting, duplicate IDs, invalid prices and fractional quantity', () => {
    for (const row of [`"${id},1,1,AVAILABLE,,`, `${id},-1,1,AVAILABLE,,`, `${id},1,1.5,AVAILABLE,,`, `${id},1,1,AVAILABLE,,\n${id},1,1,AVAILABLE,,`]) expect(() => parseInventoryCsv(csvHeader + '\n' + row)).toThrow()
  })
  it('round-trips exported concurrency versions', () => {
    const listing = { id, storeId: id, variant: { id, productId: id, label: 'Test', barcode: null }, amount: 12.5, currency: 'INR', quantity: 3, availability: 'AVAILABLE' as const, freshness: 'FRESH', observedAt: '', inventoryVersion: 7, priceVersion: 9 }
    expect(parseInventoryCsv(inventoryCsv([listing]))[0]).toMatchObject({ variantId: id, inventoryVersion: 7, priceVersion: 9, quantity: 3 })
    expect(() => inventoryCsv([{ ...listing, currency: 'USD' }])).toThrow('INR')
  })
})
