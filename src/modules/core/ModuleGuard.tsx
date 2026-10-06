import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../../components/ui/Spinner'
import { useModuleAccess } from './api'
import type { ModuleKey } from './modules'

/** Blocca l'accesso a una sezione disabilitata dall'amministratore. */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data, isLoading } = useModuleAccess()
  if (isLoading) return <PageLoader />
  if (data && !data[module]) return <Navigate to="/" replace />
  return children
}
