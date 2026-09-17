import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OfflineProvider } from './contexts/OfflineContext'
import Layout from './components/Layout'
import AuthScreen from './components/AuthScreen'
import SplashScreen from './components/SplashScreen'
import BusinessBranding from './components/BusinessBranding'
import { ToastProvider } from './contexts/ToastContext'
import DashboardPage from './pages/DashboardPage'
import SyncPage from './pages/SyncPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import InventoryPage from './pages/InventoryPage'
import StockMovementsPage from './pages/StockMovementsPage'
import InventoryHistoryPage from './pages/InventoryHistoryPage'
import LowStockAlertsPage from './pages/LowStockAlertsPage'
import TransfersPage from './pages/TransfersPage'
import SalesPage from './pages/SalesPage'
import PosPage from './pages/PosPage'
import PurchasesPage from './pages/PurchasesPage'
import SuppliersPage from './pages/SuppliersPage'
import CustomersPage from './pages/CustomersPage'
import BranchesPage from './pages/BranchesPage'
import ExpensesPage from './pages/ExpensesPage'
import ReportsPage from './pages/ReportsPage'
import UsersPage from './pages/UsersPage'
import RolesPage from './pages/RolesPage'
import NotificationsPage from './pages/NotificationsPage'
import CreateNotificationPage from './pages/CreateNotificationPage'
import UserProfilePage from './pages/UserProfilePage'
import AuditLogsPage from './pages/AuditLogsPage'
import SyncLogsPage from './pages/SyncLogsPage'
import PriceHistoryPage from './pages/PriceHistoryPage'
import MessageQueuePage from './pages/MessageQueuePage'
import SmsBalancePage from './pages/SmsBalancePage'
import BusinessSettingsPage from './pages/BusinessSettingsPage'
import SystemSettingsPage from './pages/SystemSettingsPage'
import BranchSelectionPage from './pages/BranchSelectionPage'
import NotFoundPage from './pages/NotFoundPage'
import './App.css'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsBranchSelection } = useAuth()

  if (isLoading) {
    return <SplashScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Redirect to branch selection if user hasn't picked a branch yet
  if (needsBranchSelection) {
    return <Navigate to="/select-branch" replace />
  }

  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <SplashScreen />
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function BranchSelectionRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, needsBranchSelection } = useAuth()

  if (isLoading) {
    return <SplashScreen />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If branch is already selected, go to POS
  if (!needsBranchSelection) {
    return <Navigate to="/pos" replace />
  }

  return <>{children}</>
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission, isLoading } = useAuth()

  if (isLoading) {
    return <SplashScreen />
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><AuthScreen /></PublicRoute>} />
      <Route path="/auth/reset-password" element={<AuthScreen />} />

      <Route
        path="/select-branch"
        element={<BranchSelectionRoute><BranchSelectionPage /></BranchSelectionRoute>}
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sync" element={<SyncPage />} />
        <Route path="products" element={<PermissionRoute permission="VIEW_PRODUCTS"><ProductsPage /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="VIEW_CATEGORIES"><CategoriesPage /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute permission="VIEW_INVENTORY"><InventoryPage /></PermissionRoute>} />
        <Route path="inventory/movements" element={<PermissionRoute permission="MANAGE_INVENTORY"><StockMovementsPage /></PermissionRoute>} />
        <Route path="inventory/history" element={<PermissionRoute permission="VIEW_INVENTORY"><InventoryHistoryPage /></PermissionRoute>} />
        <Route path="inventory/low-stock" element={<PermissionRoute permission="VIEW_INVENTORY"><LowStockAlertsPage /></PermissionRoute>} />
        <Route path="transfers" element={<PermissionRoute permission="VIEW_INVENTORY"><TransfersPage /></PermissionRoute>} />
        <Route path="sales" element={<PermissionRoute permission="VIEW_SALES"><SalesPage /></PermissionRoute>} />
        <Route path="pos" element={<PermissionRoute permission="CREATE_SALE"><PosPage /></PermissionRoute>} />
        <Route path="purchases" element={<PermissionRoute permission="VIEW_PURCHASES"><PurchasesPage /></PermissionRoute>} />
        <Route path="suppliers" element={<PermissionRoute permission="VIEW_SUPPLIERS"><SuppliersPage /></PermissionRoute>} />
        <Route path="customers" element={<PermissionRoute permission="VIEW_CUSTOMERS"><CustomersPage /></PermissionRoute>} />
        <Route path="branches" element={<PermissionRoute permission="MANAGE_BRANCHES"><BranchesPage /></PermissionRoute>} />
        <Route path="expenses" element={<PermissionRoute permission="VIEW_EXPENSES"><ExpensesPage /></PermissionRoute>} />
        <Route path="reports" element={<PermissionRoute permission="VIEW_REPORTS"><ReportsPage /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute permission="MANAGE_USERS"><UsersPage /></PermissionRoute>} />
        <Route path="roles" element={<PermissionRoute permission="MANAGE_USERS"><RolesPage /></PermissionRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="notifications/create" element={<PermissionRoute permission="MANAGE_NOTIFICATIONS"><CreateNotificationPage /></PermissionRoute>} />
        <Route path="profile" element={<UserProfilePage />} />
        <Route path="audit" element={<PermissionRoute permission="VIEW_AUDIT_LOGS"><AuditLogsPage /></PermissionRoute>} />
        <Route path="sync/logs" element={<PermissionRoute permission="VIEW_AUDIT_LOGS"><SyncLogsPage /></PermissionRoute>} />
        <Route path="price-history" element={<PermissionRoute permission="VIEW_PRODUCTS"><PriceHistoryPage /></PermissionRoute>} />
        <Route path="admin/queue" element={<PermissionRoute permission="MANAGE_SETTINGS"><MessageQueuePage /></PermissionRoute>} />
        <Route path="admin/sms-balance" element={<PermissionRoute permission="MANAGE_SETTINGS"><SmsBalancePage /></PermissionRoute>} />
        <Route path="business-settings" element={<PermissionRoute permission="MANAGE_SETTINGS"><BusinessSettingsPage /></PermissionRoute>} />
        <Route path="system-settings" element={<PermissionRoute permission="MANAGE_SETTINGS"><SystemSettingsPage /></PermissionRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <OfflineProvider>
        <AuthProvider>
          <ToastProvider>
            <BusinessBranding />
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </OfflineProvider>
    </HashRouter>
  )
}

export default App
