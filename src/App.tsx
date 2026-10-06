import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { FinanceLayout } from './modules/finance/FinanceLayout'
import { CategoriesPage } from './modules/finance/pages/CategoriesPage'
import { OverviewPage } from './modules/finance/pages/OverviewPage'
import { RecurringPage } from './modules/finance/pages/RecurringPage'
import { TransactionsPage } from './modules/finance/pages/TransactionsPage'
import { SettingsPage } from './modules/settings/SettingsPage'
import { AccountProvider } from './modules/finance/AccountContext'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AccountProvider>
              <AppShell />
            </AccountProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/finanze" replace />} />
        <Route path="finanze" element={<FinanceLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="movimenti" element={<TransactionsPage />} />
          <Route path="ricorrenti" element={<RecurringPage />} />
          <Route path="categorie" element={<CategoriesPage />} />
        </Route>
        <Route path="impostazioni" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/finanze" replace />} />
      </Route>
    </Routes>
  )
}
