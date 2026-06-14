import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { pageVariants } from '../components/motion'
import { AuthProvider } from '../lib/auth'
import '../styles.css'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  return (
    <AuthProvider>
      <MotionConfig reducedMotion="user">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
    </AuthProvider>
  )
}
