import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import AuthScreen from './components/AuthScreen'
import SplashScreen from './components/SplashScreen'
import { ToastProvider } from './contexts/ToastContext'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import CategoriesPage from './pages/CategoriesPage'
import InventoryPage from './pages/InventoryPage'
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
import SettingsPage from './pages/SettingsPage'
import AuditLogsPage from './pages/AuditLogsPage'
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

  // If branch is already selected, go to dashboard
  if (!needsBranchSelection) {
    return <Navigate to="/" replace />
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
      <Route path="/auth/reset-password" element={<PublicRoute><AuthScreen /></PublicRoute>} />

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
        <Route path="products" element={<PermissionRoute permission="VIEW_PRODUCTS"><ProductsPage /></PermissionRoute>} />
        <Route path="categories" element={<PermissionRoute permission="VIEW_CATEGORIES"><CategoriesPage /></PermissionRoute>} />
        <Route path="inventory" element={<PermissionRoute permission="VIEW_INVENTORY"><InventoryPage /></PermissionRoute>} />
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
        <Route path="settings" element={<PermissionRoute permission="MANAGE_SETTINGS"><SettingsPage /></PermissionRoute>} />
        <Route path="audit" element={<PermissionRoute permission="VIEW_AUDIT_LOGS"><AuditLogsPage /></PermissionRoute>} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
