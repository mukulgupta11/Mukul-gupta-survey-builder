import { createRootRoute, Outlet } from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { AuthProvider } from '../lib/auth'
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <Outlet />
      </MotionConfig>
    </AuthProvider>
  )
}
