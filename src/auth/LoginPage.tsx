import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { ErrorText, Field, Input } from '../components/ui/Field'
import { errorMessage, isSupabaseConfigured, supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setLoading(false)
    if (error) setError(errorMessage(error))
  }

  return (
    <div className="dot-grid flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 rounded-3xl border border-line bg-surface p-6 shadow-2xl">
        <div className="space-y-1">
          <div className="mb-4 flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="size-8" />
            <span className="font-mono text-xs tracking-[0.2em] text-faint uppercase">Personal</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Accedi</h1>
          <p className="text-sm text-muted">Accesso riservato agli utenti invitati.</p>
        </div>
        {!isSupabaseConfigured && (
          <ErrorText error="Supabase non configurato: imposta VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY." />
        )}
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorText error={error} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
          Entra
        </Button>
      </form>
    </div>
  )
}
