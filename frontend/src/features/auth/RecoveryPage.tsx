import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { apiRequest } from './api'
import { inputClass, PageShell } from '../stores/StorePages'

export function RecoveryPage() {
  const reset = useMutation({ mutationFn: (input: { token: string; password: string }) => apiRequest('/auth/recovery', { method: 'POST', body: JSON.stringify(input) }) })
  return <PageShell title="Recover your account"><p className="mt-4">Contact the Parth Local team through the store or merchant who helped you join. After verifying ownership, an administrator can provide a code valid for 30 minutes.</p><form className="mt-6 space-y-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); reset.mutate({ token: String(data.get('token')).trim(), password: String(data.get('password')) }) }}>
    <label className="block">Recovery code<input className={inputClass} name="token" required maxLength={100} autoComplete="off" /></label><label className="block">New password<input className={inputClass} name="password" required type="password" minLength={12} maxLength={72} autoComplete="new-password" /></label>
    {reset.error && <p role="alert" className="text-red-700">{reset.error.message}</p>}{reset.isSuccess && <p role="status">Password updated. <Link className="underline" to="/login">Sign in with your new password</Link>.</p>}<button className="min-h-11 rounded-lg bg-emerald-700 px-4 font-semibold text-white" disabled={reset.isPending || reset.isSuccess}>Set new password</button>
  </form></PageShell>
}
