import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext } from './AuthContext'
import * as authApi from './api'
import type { AuthResponse, RegisterInput } from './api'

export function AuthProvider({ children }: PropsWithChildren) {
  const generation = useRef(0)
  const queryClient = useQueryClient()
  const [session, setSession] = useState<AuthResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const current = generation.current
    authApi
      .refresh()
      .then(next => { if (generation.current === current) setSession(next) })
      .catch(() => { if (generation.current === current) setSession(null) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!session) return
    const timer = window.setTimeout(() => {
      const current = generation.current
      authApi.refresh().then(next => { if (generation.current === current) setSession(next) }).catch(() => { if (generation.current === current) { queryClient.clear(); setSession(null) } })
    }, Math.max(1000, (session.expiresInSeconds - 60) * 1000))
    return () => window.clearTimeout(timer)
  }, [session, queryClient])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      loading,
      login: async (email: string, password: string) => { const next = await authApi.login(email, password); generation.current++; queryClient.clear(); setSession(next) },
      register: async (input: RegisterInput) => { const next = await authApi.register(input); generation.current++; queryClient.clear(); setSession(next) },
      logout: async () => {
        generation.current++
        try { await authApi.logout() } finally { queryClient.clear(); setSession(null) }
      },
    }),
    [loading, session, queryClient],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
