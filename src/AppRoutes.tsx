import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { TenantPortfolioPage } from './pages/TenantPortfolioPage'

type AppRoutesProps = Readonly<{
  authenticated: boolean
  onLogin: () => void
  onLogout: () => void
}>

export function AppRoutes({ authenticated, onLogin, onLogout }: AppRoutesProps) {
  return (
    <Routes>
      <Route
        path="/login"
        element={authenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={onLogin} />}
      />
      <Route
        path="/dashboard"
        element={authenticated ? <DashboardPage onLogout={onLogout} /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/tenant/:tenantId"
        element={authenticated ? <TenantPortfolioPage onLogout={onLogout} /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to={authenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}
