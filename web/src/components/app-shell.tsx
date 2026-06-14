import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { Icon } from './icons'
import { easeOut, tapPress } from './motion'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      {!compact && <strong>Luma</strong>}
    </div>
  )
}

export function LoadingScreen({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <BrandMark />
      <span className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function AppShell({
  children,
  title,
  eyebrow,
  actions,
}: {
  children: ReactNode
  title: string
  eyebrow?: string
  actions?: ReactNode
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navItems = [
    { to: '/app', label: 'Overview', icon: 'home', exact: true },
    { to: '/app/surveys', label: 'Surveys', icon: 'layers' },
    { to: '/app/responses', label: 'Responses', icon: 'bar-chart' },
  ] as const

  const handleSignOut = async () => {
    await signOut()
    await navigate({ to: '/' })
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <motion.div className="sidebar-brand" whileHover={{ x: 2 }}>
          <Link to="/app">
            <BrandMark />
          </Link>
        </motion.div>
        <nav className="sidebar-nav" aria-label="Workspace">
          {navItems.map((item) => {
            const active =
              'exact' in item && item.exact ? pathname === item.to : pathname.startsWith(item.to)
            return (
              <motion.div whileHover={{ x: 3 }} key={item.to}>
                <Link to={item.to} className={`sidebar-link ${active ? 'active' : ''}`}>
                  {active && (
                    <motion.span
                      className="sidebar-active-pill"
                      layoutId="sidebar-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon name={item.icon} />
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              </motion.div>
            )
          })}
        </nav>
        <motion.div className="sidebar-tip" whileHover={{ y: -3 }}>
          <span className="tip-icon">
            <Icon name="sparkle" size={16} />
          </span>
          <strong>Make it feel like you.</strong>
          <p>Brand every touchpoint, not just the thank-you page.</p>
        </motion.div>
        <div className="sidebar-user">
          <span className="avatar">{user?.email.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{user?.email.split('@')[0]}</strong>
            <small>{user?.email}</small>
          </span>
          <motion.button
            type="button"
            className="icon-button"
            onClick={handleSignOut}
            aria-label="Sign out"
            whileHover={{ rotate: -8, scale: 1.05 }}
            whileTap={tapPress}
          >
            <Icon name="logout" size={17} />
          </motion.button>
        </div>
      </aside>
      <main className="app-main">
        <motion.header
          className="page-header"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
        >
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h1>{title}</h1>
          </motion.div>
          {actions && (
            <motion.div
              className="page-actions"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              {actions}
            </motion.div>
          )}
        </motion.header>
        {children}
      </main>
    </div>
  )
}
