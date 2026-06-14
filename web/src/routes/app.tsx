import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router'
import { LoadingScreen } from '../components/app-shell'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/app')({
  component: AppGate,
})

function AppGate() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" />
  return <Outlet />
}
