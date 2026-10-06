import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../components/ui/Spinner'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!session) return <Navigate to="/login" replace />
  return children
}
