import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from './AuthContext'

const schema = z.object({
  displayName: z.string().trim().max(100).optional(),
  email: z.email(),
  password: z.string().min(12, 'Use at least 12 characters').max(72),
  accountType: z.enum(['CUSTOMER', 'STORE_OWNER']).optional(),
})

type FormValues = z.infer<typeof schema>

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { accountType: 'CUSTOMER' },
  })

  const submit = handleSubmit(async (values) => {
    setError('')
    try {
      if (mode === 'login') await auth.login(values.email, values.password)
      else {
        await auth.register({
          email: values.email,
          password: values.password,
          displayName: values.displayName ?? '',
          accountType: values.accountType ?? 'CUSTOMER',
        })
      }
      navigate('/account', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Request failed')
    }
  })

  const isRegister = mode === 'register'
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
      <Link className="mb-8 text-xl font-bold text-emerald-800 sm:mb-10" to="/">
        Parth Local
      </Link>
      <h1 className="text-2xl font-bold text-stone-950 sm:text-3xl">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
      <form className="mt-8 space-y-5" onSubmit={submit}>
        {isRegister && (
          <Field label="Name" error={errors.displayName?.message}>
            <input autoComplete="name" {...register('displayName')} />
          </Field>
        )}
        <Field label="Email" error={errors.email?.message}>
          <input autoComplete="email" type="email" {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input autoComplete={isRegister ? 'new-password' : 'current-password'} type="password" {...register('password')} />
        </Field>
        {isRegister && (
          <Field label="Account type" error={errors.accountType?.message}>
            <select {...register('accountType')}>
              <option value="CUSTOMER">Customer</option>
              <option value="STORE_OWNER">Store owner</option>
            </select>
          </Field>
        )}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>
      </form>
      {mode === 'login' && <Link className="mt-4 inline-block text-emerald-800 underline" to="/recover">Need help accessing your account?</Link>}
      <p className="mt-6 text-sm text-stone-600">
        {isRegister ? 'Already registered?' : 'New to Parth Local?'}{' '}
        <Link className="font-semibold text-emerald-800 underline" to={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </main>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactElement<{ className?: string }> }) {
  return (
    <label className="block text-sm font-medium text-stone-800">
      {label}
      <span className="mt-2 block [&>input]:min-h-12 [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-stone-300 [&>input]:px-3 [&>select]:min-h-12 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-stone-300 [&>select]:bg-white [&>select]:px-3">
        {children}
      </span>
      {error && <span className="mt-1 block text-red-700">{error}</span>}
    </label>
  )
}
