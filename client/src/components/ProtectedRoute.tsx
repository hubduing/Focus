import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

interface ProtectedRouteProps {
  children?: ReactNode
  adminOnly?: boolean
  redirect?: string
}

export default function ProtectedRoute({ children, adminOnly = false, redirect = '/login' }: ProtectedRouteProps) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Spinner />

  if (!user) {
    return <Navigate to={redirect} state={{ from: location.pathname }} replace />
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}