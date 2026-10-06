import { Apple, Dumbbell, ShoppingCart, Wallet, type LucideIcon } from 'lucide-react'

export type ModuleKey = 'finance' | 'shopping' | 'workout' | 'nutrition'

export type ModuleDef = {
  key: ModuleKey
  label: string
  description: string
  path: string
  icon: LucideIcon
  color: string
  soon?: boolean
}

export const MODULES: ModuleDef[] = [
  { key: 'finance', label: 'Finanze', description: 'Entrate, uscite e conti', path: '/finanze', icon: Wallet, color: '#c6f432' },
  { key: 'shopping', label: 'Spesa', description: 'Liste condivise', path: '/spesa', icon: ShoppingCart, color: '#2dd4bf' },
  { key: 'workout', label: 'Allenamento', description: 'Schede, palestra, corsa e nuoto', path: '/allenamento', icon: Dumbbell, color: '#fb923c' },
  { key: 'nutrition', label: 'Alimentazione', description: 'Pasti, acqua e peso', path: '/alimentazione', icon: Apple, color: '#f472b6', soon: true },
]
