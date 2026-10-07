import { Apple, Briefcase, Dumbbell, ShoppingCart, Wallet, type LucideIcon } from 'lucide-react'

export type ModuleKey = 'finance' | 'shopping' | 'workout' | 'nutrition' | 'work'

export type ModuleDef = {
  key: ModuleKey
  label: string
  /** Etichetta breve per la barra in basso. */
  navLabel?: string
  description: string
  path: string
  icon: LucideIcon
  color: string
  soon?: boolean
}

export const MODULES: ModuleDef[] = [
  { key: 'finance', label: 'Finanze', description: 'Entrate, uscite e conti', path: '/finanze', icon: Wallet, color: '#c6f432' },
  { key: 'shopping', label: 'Spesa', description: 'Liste condivise', path: '/spesa', icon: ShoppingCart, color: '#2dd4bf' },
  { key: 'workout', label: 'Allenamento', navLabel: 'Sport', description: 'Schede, palestra e cardio', path: '/allenamento', icon: Dumbbell, color: '#fb923c' },
  { key: 'nutrition', label: 'Alimentazione', navLabel: 'Pasti', description: 'Pasti, acqua e peso', path: '/alimentazione', icon: Apple, color: '#f472b6' },
  { key: 'work', label: 'Lavoro', description: 'Orario di uscita e straordinari', path: '/lavoro', icon: Briefcase, color: '#3987e5' },
]
