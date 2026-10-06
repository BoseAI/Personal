import { Outlet } from 'react-router-dom'
import { useShoppingSync } from './api'

export function ShoppingLayout() {
  useShoppingSync()
  return <Outlet />
}
