import type { Listing } from './api'

export type ImportRow = { variantId: string; amount: number; quantity: number | null; availability: Listing['availability']; inventoryVersion: number | null; priceVersion: number | null }
export const csvHeader = 'variantId,amount,quantity,availability,inventoryVersion,priceVersion'

export function parseInventoryCsv(text: string): ImportRow[] {
  if (text.length > 1_000_000) throw new Error('CSV must be smaller than 1 MB.')
  const rows: string[][] = []
  let row: string[] = [], field = '', quoted = false, closed = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else field += char
    } else if (char === '"') {
      if (field || closed) throw new Error('Malformed CSV quoting.')
      quoted = true
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(field); field = ''; closed = false
      if (char !== ',') {
        if (char === '\r' && text[i + 1] === '\n') i++
        if (row.some(value => value.trim())) rows.push(row)
        row = []
      }
    } else {
      if (closed) throw new Error('Unexpected text after a quoted CSV value.')
      field += char
    }
  }
  if (quoted) throw new Error('Unclosed CSV quote.')
  row.push(field)
  if (row.some(value => value.trim())) rows.push(row)
  if (rows.shift()?.map(value => value.trim()).join(',') !== csvHeader) throw new Error(`Use these headers: ${csvHeader}`)
  if (!rows.length || rows.length > 500) throw new Error('Import between 1 and 500 rows at a time.')
  const seen = new Set<string>()
  return rows.map((values, index) => {
    if (values.length !== 6) throw new Error(`Row ${index + 2}: expected 6 columns.`)
    const [variantId, amount, quantity, availability, inventoryVersion, priceVersion] = values.map(value => value.trim())
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(variantId) || seen.has(variantId.toLowerCase())) throw new Error(`Row ${index + 2}: invalid or duplicate variant ID.`)
    seen.add(variantId.toLowerCase())
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) throw new Error(`Row ${index + 2}: use a positive price with up to two decimals.`)
    if (!['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'UNKNOWN'].includes(availability)) throw new Error(`Row ${index + 2}: invalid availability.`)
    const integer = (value: string) => {
      if (value === '') return null
      if (!/^\d+$/.test(value) || Number(value) > 2147483647) throw new Error(`Row ${index + 2}: quantity and versions must be whole nonnegative numbers.`)
      return Number(value)
    }
    return { variantId, amount: Number(amount), quantity: integer(quantity), availability: availability as Listing['availability'], inventoryVersion: integer(inventoryVersion), priceVersion: integer(priceVersion) }
  })
}

export function inventoryCsv(listings: Listing[]) {
  if (listings.some(item => item.currency !== 'INR')) throw new Error('CSV import/export currently supports INR listings only.')
  return csvHeader + '\r\n' + listings.map(item => [item.variant.id, item.amount, item.quantity ?? '', item.availability, item.inventoryVersion, item.priceVersion].join(',')).join('\r\n')
}
