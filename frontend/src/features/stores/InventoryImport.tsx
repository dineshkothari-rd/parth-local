import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { apiRequest } from '../auth/api'
import { listStoreProducts, type Listing } from './api'
import { csvHeader, inventoryCsv, parseInventoryCsv, type ImportRow } from './inventoryCsv'

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  URL.revokeObjectURL(url)
}

export function InventoryImport({ token, storeId }: { token: string; storeId: string }) {
  const client = useQueryClient()
  const [rows, setRows] = useState<ImportRow[]>([])
  const [error, setError] = useState('')
  const preview = useMutation({ mutationFn: (input: ImportRow[]) => apiRequest<{ added: number; updated: number }>(`/owner/stores/${storeId}/products/import`, { method: 'POST', body: JSON.stringify({ rows: input, preview: true }) }, token) })
  const save = useMutation({ mutationFn: () => apiRequest(`/owner/stores/${storeId}/products/import`, { method: 'POST', body: JSON.stringify({ rows, preview: false }) }, token), onSuccess: () => {
    setRows([]); preview.reset()
    for (const key of ['owner-listings', 'owner-analytics', 'owner-freshness']) void client.invalidateQueries({ queryKey: [key, storeId] })
  } })
  const exporting = useMutation({ mutationFn: async () => {
    const listings: Listing[] = []
    for (let page = 0; ; page++) {
      const result = await listStoreProducts(token, storeId, page)
      if (result.totalElements > 10000) throw new Error('Export supports up to 10,000 listings.')
      listings.push(...result.content)
      if ((page + 1) * 100 >= result.totalElements) break
    }
    download(inventoryCsv(listings), 'nearkart-inventory.csv')
  } })
  const busy = preview.isPending || save.isPending
  return <section className="mt-8 rounded-xl border bg-white p-4">
    <h2 className="text-xl font-bold">Import and export inventory</h2>
    <p className="mt-2 text-sm text-stone-600">INR prices · up to 500 rows per import. Export before editing existing items to keep their version numbers. For new items, use the variant ID from catalog search and leave both versions blank. Importing confirms the stock you checked.</p>
    <div className="mt-3 flex flex-wrap gap-3">
      <button className="min-h-11 rounded-lg border px-4" onClick={() => download(csvHeader + '\r\n', 'nearkart-template.csv')} type="button">Download template</button>
      <button className="min-h-11 rounded-lg border px-4" disabled={exporting.isPending} onClick={() => exporting.mutate()} type="button">{exporting.isPending ? 'Exporting…' : 'Export inventory'}</button>
    </div>
    <label className="mt-4 block font-semibold">Choose CSV file<input className="mt-2 block w-full" type="file" accept=".csv,text/csv" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; setRows([]); setError(''); preview.reset(); save.reset()
      if (!file) return
      try { if (file.size > 1_000_000) throw new Error('CSV must be smaller than 1 MB.'); const input = parseInventoryCsv(await file.text()); setRows(input); preview.mutate(input) }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not read file.') }
    }} /></label>
    {preview.isPending && <p role="status">Validating inventory…</p>}
    {preview.data && rows.length > 0 && <><p className="mt-3" role="status">Preview: {preview.data.added} new, {preview.data.updated} updated items.</p><div className="mt-3 max-h-60 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Variant ID</th><th>Price</th><th>Quantity</th><th>Availability</th></tr></thead><tbody>{rows.map(row => <tr key={row.variantId}><td className="break-all p-2">{row.variantId}</td><td>₹{row.amount}</td><td>{row.quantity ?? 'Unknown'}</td><td>{row.availability}</td></tr>)}</tbody></table></div><button className="mt-3 min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={busy} onClick={() => save.mutate()} type="button">{save.isPending ? 'Importing…' : 'Confirm import'}</button></>}
    {(error || preview.error || save.error || exporting.error) && <p className="mt-3 text-red-700" role="alert">{error || preview.error?.message || save.error?.message || exporting.error?.message}</p>}
    {save.isSuccess && <p className="mt-3 text-emerald-800" role="status">Inventory imported successfully.</p>}
  </section>
}
