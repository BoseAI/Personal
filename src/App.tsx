import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/layout/AppShell'
import { ModuleGuard } from './modules/core/ModuleGuard'
import { AccountProvider } from './modules/finance/AccountContext'
import { FinanceLayout } from './modules/finance/FinanceLayout'
import { CategoriesPage } from './modules/finance/pages/CategoriesPage'
import { OverviewPage } from './modules/finance/pages/OverviewPage'
import { RecurringPage } from './modules/finance/pages/RecurringPage'
import { TransactionsPage } from './modules/finance/pages/TransactionsPage'
import { HomePage } from './modules/home/HomePage'
import { SettingsPage } from './modules/settings/SettingsPage'
import { ListPage } from './modules/shopping/pages/ListPage'
import { ShoppingHome } from './modules/shopping/pages/ShoppingHome'
import { ShoppingLayout } from './modules/shopping/ShoppingLayout'
import { ActivitiesPage } from './modules/workout/pages/ActivitiesPage'
import { LivePage } from './modules/workout/pages/LivePage'
import { PlanEditorPage } from './modules/workout/pages/PlanEditorPage'
import { PlansPage } from './modules/workout/pages/PlansPage'
import { ProgressPage } from './modules/workout/pages/ProgressPage'
import { SessionDetailPage } from './modules/workout/pages/SessionDetailPage'
import { SummaryPage } from './modules/workout/pages/SummaryPage'
import { WorkoutLayout } from './modules/workout/WorkoutLayout'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomePage />} />
        <Route
          path="finanze"
          element={
            <ModuleGuard module="finance">
              <AccountProvider>
                <FinanceLayout />
              </AccountProvider>
            </ModuleGuard>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="movimenti" element={<TransactionsPage />} />
          <Route path="ricorrenti" element={<RecurringPage />} />
          <Route path="categorie" element={<CategoriesPage />} />
        </Route>
        <Route
          path="spesa"
          element={
            <ModuleGuard module="shopping">
              <ShoppingLayout />
            </ModuleGuard>
          }
        >
          <Route index element={<ShoppingHome />} />
          <Route path=":listId" element={<ListPage />} />
        </Route>
        <Route
          path="allenamento"
          element={
            <ModuleGuard module="workout">
              <WorkoutLayout />
            </ModuleGuard>
          }
        >
          <Route index element={<SummaryPage />} />
          <Route path="schede" element={<PlansPage />} />
          <Route path="schede/:planId" element={<PlanEditorPage />} />
          <Route path="attivita" element={<ActivitiesPage />} />
          <Route path="attivita/:sessionId" element={<SessionDetailPage />} />
          <Route path="progressi" element={<ProgressPage />} />
          <Route path="live" element={<LivePage />} />
        </Route>
        <Route path="impostazioni" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
