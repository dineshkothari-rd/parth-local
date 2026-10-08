import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiRequest } from '../auth/api'
import { useAuth } from '../auth/AuthContext'
import { inputClass, PageShell } from '../stores/StorePages'

type Resource = 'users' | 'stores' | 'reviews' | 'reports' | 'categories' | 'products' | 'variants' | 'audit-logs'
type Row = { id: string; name?: string; email?: string; displayName?: string; status?: string; version?: number; categoryId?: string; productId?: string; brand?: string; label?: string; barcode?: string } & Record<string, unknown>
type Page = { content: Row[]; totalElements: number }
const tabs: Resource[] = ['users', 'stores', 'reviews', 'reports', 'categories', 'products', 'variants', 'audit-logs']
const labels: Record<Resource, string> = { users: 'Users', stores: 'Stores', reviews: 'Reviews', reports: 'Reports', categories: 'Categories', products: 'Products', variants: 'Variants', 'audit-logs': 'Audit logs' }
const paths: Record<Resource, string> = { users: '/admin/users', stores: '/admin/moderation/stores', reviews: '/admin/reviews', reports: '/admin/reports', categories: '/admin/catalog/categories', products: '/admin/catalog/products', variants: '/admin/catalog/variants', 'audit-logs': '/admin/audit-logs' }
const statuses: Partial<Record<Resource, string[]>> = { users: ['ACTIVE', 'SUSPENDED'], stores: ['APPROVED', 'SUSPENDED'], reviews: ['APPROVED', 'REJECTED'], reports: ['RESOLVED', 'DISMISSED'], products: ['ACTIVE', 'INACTIVE'] }
const buttonClass = 'min-h-11 rounded-lg border px-4 py-2 font-semibold disabled:opacity-50'

export function AdminPage() {
  const [resource, setResource] = useState<Resource>('users')
  return <PageShell title="Administration">
    <Link className="mt-4 inline-block font-semibold text-emerald-800 underline" to="/admin/stores">Pending store approvals</Link>
    <nav aria-label="Administration sections" className="my-6 flex flex-wrap gap-2">{tabs.map(tab => <button className={buttonClass} aria-pressed={resource === tab} key={tab} onClick={() => setResource(tab)} type="button">{labels[tab]}</button>)}</nav>
    <ResourcePanel key={resource} resource={resource} />
  </PageShell>
}

function ResourcePanel({ resource }: { resource: Resource }) {
  const { accessToken } = useAuth()
  const token = accessToken!
  const client = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Row | null>(null)
  const [recovery, setRecovery] = useState<{ token: string; expiresAt: string } | null>(null)
  const rows = useQuery({ queryKey: ['admin', resource, q, page], queryFn: () => apiRequest<Page>(`${paths[resource]}?q=${encodeURIComponent(q)}&page=${page}`, {}, token) })
  const change = useMutation({
    mutationFn: ({ path, body, method = 'PATCH' }: { path: string; body: object; method?: string }) => apiRequest(path, { method, body: JSON.stringify(body) }, token),
    onSuccess: () => { setEditing(null); void client.invalidateQueries({ queryKey: ['admin'] }) },
  })
  const issue = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => apiRequest<{ token: string; expiresAt: string }>(`/admin/users/${id}/recovery`, { method: 'POST', body: JSON.stringify({ identityVerified: true, reason }) }, token), onSuccess: setRecovery })
  const catalog = ['categories', 'products', 'variants'].includes(resource)
  function moderate(event: FormEvent<HTMLFormElement>, row: Row) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    change.mutate({ path: `${paths[resource]}/${row.id}${resource === 'products' ? '/status' : ''}`, body: { status: data.get('status'), reason: data.get('reason'), expectedVersion: row.version ?? 0 } })
  }
  return <section aria-label={labels[resource]}>
    <div className="flex flex-wrap gap-3"><label className="flex-1">Search {labels[resource].toLowerCase()}<input className={`${inputClass} mt-1`} maxLength={120} value={q} onChange={event => { setQ(event.target.value); setPage(0) }} /></label>{catalog && <button className={buttonClass} onClick={() => setEditing({ id: '' })} type="button">Create {resource === 'categories' ? 'category' : resource === 'products' ? 'product' : 'variant'}</button>}</div>
    {rows.isLoading && <p role="status" className="mt-4">Loading…</p>}
    {[rows.error, change.error, issue.error].map((error, index) => error && <p className="mt-4 text-red-700" role="alert" key={index}>{error.message}</p>)}
    {change.isSuccess && <p className="mt-4 text-emerald-800" role="status">Changes saved.</p>}
    {recovery && <div className="my-4 rounded-xl border bg-white p-4"><p>Share this code privately with the verified account holder. It expires at {new Date(recovery.expiresAt).toLocaleString()}.</p><label className="mt-3 block">Recovery code<input className={inputClass} readOnly value={recovery.token} /></label><p className="mt-2">They can enter it on the <Link className="underline" to="/recover">account recovery page</Link>.</p><button className={`${buttonClass} mt-3`} onClick={() => setRecovery(null)} type="button">Dismiss code</button></div>}
    {editing && <CatalogForm key={editing.id} resource={resource} row={editing} pending={change.isPending} onCancel={() => setEditing(null)} onSave={body => change.mutate({ path: `${paths[resource]}${editing.id ? `/${editing.id}` : ''}`, method: editing.id ? 'PATCH' : 'POST', body })} />}
    {rows.data?.content.length === 0 && <p className="mt-4">No matching records.</p>}
    <ul className="mt-4 space-y-4">{rows.data?.content.map(row => <li className="rounded-xl border bg-white p-4" key={row.id}>
      <h2 className="break-words text-lg font-bold">{row.name ?? row.email ?? row.label ?? (resource === 'reviews' ? 'Customer review' : resource === 'reports' ? 'Customer report' : String(row.action))}</h2>
      <dl className="mt-2 space-y-1">{Object.entries(row).filter(([key, value]) => !['id', 'version', 'name', 'label', 'email', 'isAdmin', 'userId', 'storeId', 'ownerId', 'categoryId', 'productId'].includes(key) && value !== null).map(([key, value]) => <div className="flex flex-wrap gap-2 break-all text-sm" key={key}><dt className="font-semibold">{key.replace(/([A-Z])/g, ' $1')}:</dt><dd>{String(value)}</dd></div>)}</dl>
      {catalog && <button className={`${buttonClass} mt-3`} onClick={() => setEditing(row)} type="button">Edit</button>}
      {statuses[resource] && !row.isAdmin && <form className="mt-3 flex flex-wrap gap-2" onSubmit={event => moderate(event, row)}>
        <label>Status<select className={inputClass} name="status" defaultValue={statuses[resource]!.includes(row.status ?? '') ? row.status : statuses[resource]![0]}>{statuses[resource]!.map(status => <option value={status} key={status}>{status.replaceAll('_', ' ').toLowerCase()}</option>)}</select></label>
        <label className="min-w-0 flex-1">Reason<input className={inputClass} name="reason" required maxLength={500} /></label><button className={`${buttonClass} self-end`} disabled={change.isPending || (resource === 'stores' && !['APPROVED', 'SUSPENDED'].includes(row.status ?? ''))}>Save status</button>
      </form>}
      {resource === 'stores' && row.status === 'PENDING' && <Link className="mt-3 block underline" to="/admin/stores">Review pending approval</Link>}
      {resource === 'users' && row.status === 'ACTIVE' && !row.isAdmin && <form className="mt-4 space-y-2" onSubmit={event => { event.preventDefault(); setRecovery(null); const data = new FormData(event.currentTarget); issue.mutate({ id: row.id, reason: String(data.get('reason')) }) }}>
        <details><summary className="cursor-pointer font-semibold">Assist account recovery</summary><p className="my-2">Verify ownership through your support process before issuing a code. Do not record private identity documents here.</p><label className="block">Verification reference<input className={inputClass} required name="reason" maxLength={500} /></label><label className="my-3 flex gap-2"><input required type="checkbox" />I verified the account holder’s identity.</label><button className={buttonClass} disabled={issue.isPending}>Issue one-time code</button></details>
      </form>}
    </li>)}</ul>
    <div className="mt-5 flex items-center gap-3"><button className={buttonClass} disabled={page === 0 || rows.isFetching} onClick={() => setPage(page - 1)} type="button">Previous</button><span>Page {page + 1}</span><button className={buttonClass} disabled={!rows.data || (page + 1) * 20 >= rows.data.totalElements || rows.isFetching} onClick={() => setPage(page + 1)} type="button">Next</button></div>
  </section>
}

function CatalogForm({ resource, row, pending, onSave, onCancel }: { resource: Resource; row: Row; pending: boolean; onSave: (body: object) => void; onCancel: () => void }) {
  const { accessToken } = useAuth()
  const parent = resource === 'products' ? 'categories' : 'products'
  const [parentPage, setParentPage] = useState(0)
  const [parentSearch, setParentSearch] = useState('')
  const [parentId, setParentId] = useState(String(row.categoryId ?? row.productId ?? ''))
  const parents = useQuery({ queryKey: ['admin', 'parent', parent, parentSearch, parentPage], enabled: resource !== 'categories', queryFn: () => apiRequest<Page>(`/admin/catalog/${parent}?q=${encodeURIComponent(parentSearch)}&page=${parentPage}`, {}, accessToken!) })
  return <form className="my-5 space-y-3 rounded-xl border bg-white p-4" onSubmit={event => {
    event.preventDefault(); const data = new FormData(event.currentTarget)
    onSave(resource === 'categories' ? { name: data.get('name') } : resource === 'products' ? { categoryId: parentId, name: data.get('name'), brand: data.get('brand') } : { productId: parentId, label: data.get('label'), barcode: String(data.get('barcode')) || null })
  }}>
    <h2 className="text-lg font-bold">{row.id ? 'Edit' : 'Create'} {resource === 'categories' ? 'category' : resource === 'products' ? 'product' : 'variant'}</h2>
    {resource !== 'categories' && <div><label>Find {parent}<input className={inputClass} maxLength={120} value={parentSearch} onChange={event => { setParentSearch(event.target.value); setParentPage(0) }} /></label><label className="mt-2 block">{resource === 'products' ? 'Category' : 'Product'}<select className={inputClass} required disabled={resource === 'variants' && Boolean(row.id)} value={parentId} onChange={event => setParentId(event.target.value)}><option value="">Select…</option>{parentId && !parents.data?.content.some(item => item.id === parentId) && <option value={parentId}>Current selection</option>}{parents.data?.content.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{parents.error && <p role="alert">{parents.error.message}</p>}<div className="mt-2 flex gap-2"><button className={buttonClass} disabled={parentPage === 0} onClick={() => setParentPage(parentPage - 1)} type="button">Previous choices</button><button className={buttonClass} disabled={!parents.data || (parentPage + 1) * 20 >= parents.data.totalElements} onClick={() => setParentPage(parentPage + 1)} type="button">More choices</button></div></div>}
    {resource === 'variants' ? <><label className="block">Variant label<input className={inputClass} required name="label" maxLength={120} defaultValue={row.label} /></label><label className="block">Barcode (optional)<input className={inputClass} name="barcode" maxLength={64} defaultValue={row.barcode ?? ''} /></label></> : <label className="block">Name<input className={inputClass} required name="name" maxLength={resource === 'categories' ? 100 : 180} defaultValue={row.name} /></label>}
    {resource === 'products' && <label className="block">Brand (optional)<input className={inputClass} name="brand" maxLength={120} defaultValue={row.brand ?? ''} /></label>}
    <div className="flex gap-2"><button className={buttonClass} disabled={pending}>Save</button><button className={buttonClass} disabled={pending} onClick={onCancel} type="button">Cancel</button></div>
  </form>
}
