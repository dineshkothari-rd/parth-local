import { useState, type FormEvent } from 'react'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthPage } from '../features/auth/AuthPage'
import { useAuth } from '../features/auth/AuthContext'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { AdminStoresPage, OwnerStoresPage } from '../features/stores/StorePages'
import { SearchPage } from '../features/search/SearchPage'
import { ProductPage, SavedPage, StorePage } from '../features/customer/CustomerPages'
import { OwnerDashboardPage } from '../features/stores/OwnerDashboardPage'

function HomePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  function search(event: FormEvent) {
    event.preventDefault()
    if (query.trim().length >= 2) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-5 sm:px-6 sm:py-6">
      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Primary navigation">
        <Link className="text-xl font-bold text-emerald-800" to="/">
          NearKart
        </Link>
        <div className="flex items-center gap-3 text-sm font-semibold sm:gap-4">
          <Link className="text-stone-700 hover:text-emerald-800" to="/login">Sign in</Link>
          <Link className="text-emerald-800" to="/register">Create account</Link>
        </div>
      </nav>

      <section className="my-auto max-w-3xl py-12 sm:py-20">
        <p className="mb-4 font-semibold text-emerald-700">Local products, without delivery fees</p>
        <h1 className="text-4xl font-bold tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
          Find it nearby. Pay less. Skip delivery.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-stone-600">
          Compare nearby store prices, distance, availability, and how recently stock was updated.
        </p>
        <form className="mt-10 flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={search} role="search">
          <label className="sr-only" htmlFor="product-search">
            Search for a product
          </label>
          <input
            className="min-h-12 w-full flex-1 rounded-xl border border-stone-300 bg-white px-4 text-stone-950 shadow-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
            id="product-search"
            name="q"
            placeholder="Search for a product..."
            required
            minLength={2}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            className="min-h-12 w-full rounded-xl bg-emerald-700 px-6 font-semibold text-white hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 sm:w-auto"
            type="submit"
          >
            Search nearby
          </button>
        </form>
      </section>
    </main>
  )
}

function AccountPage() {
  const { user, logout } = useAuth()
  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link className="text-xl font-bold text-emerald-800" to="/">NearKart</Link>
      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:mt-16 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Signed in</p>
        <h1 className="mt-2 break-words text-2xl font-bold text-stone-950 sm:text-3xl">Hello, {user?.displayName}</h1>
        <p className="mt-2 break-all text-stone-600">{user?.email}</p>
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
          {user?.roles.includes('STORE_OWNER') && <Link className="font-semibold text-emerald-800 underline" to="/owner/stores">Manage stores</Link>}
          {user?.roles.includes('ADMIN') && <Link className="font-semibold text-emerald-800 underline" to="/admin/stores">Review stores</Link>}
          {user?.roles.includes('CUSTOMER') && <Link className="font-semibold text-emerald-800 underline" to="/saved">Favorites and history</Link>}
        </div>
        <button className="mt-8 min-h-11 w-full rounded-xl border border-stone-300 px-4 py-2 font-semibold sm:w-auto" onClick={() => void logout()} type="button">
          Sign out
        </button>
      </section>
    </main>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<AuthPage mode="login" />} path="/login" />
      <Route element={<AuthPage mode="register" />} path="/register" />
      <Route element={<SearchPage />} path="/search" />
      <Route element={<ProductPage />} path="/products/:id" />
      <Route element={<StorePage />} path="/stores/:id" />
      <Route element={<ProtectedRoute />}>
        <Route element={<AccountPage />} path="/account" />
      </Route>
      <Route element={<ProtectedRoute role="STORE_OWNER" />}>
        <Route element={<OwnerStoresPage />} path="/owner/stores" />
        <Route element={<OwnerDashboardPage />} path="/owner/stores/:id" />
      </Route>
      <Route element={<ProtectedRoute role="ADMIN" />}>
        <Route element={<AdminStoresPage />} path="/admin/stores" />
      </Route>
      <Route element={<ProtectedRoute role="CUSTOMER" />}>
        <Route element={<SavedPage />} path="/saved" />
      </Route>
    </Routes>
  )
}
