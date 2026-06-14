import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { type FormEvent, useState } from 'react'
import { BrandMark } from '../components/app-shell'
import { Icon } from '../components/icons'
import { easeOut, fadeUp, stagger, tapPress } from '../components/motion'
import { signIn } from '../lib/api'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/login')({
  component: Login,
})

function Login() {
  const navigate = useNavigate()
  const { user, loading, setSignedIn } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const reducedMotion = useReducedMotion()

  if (!loading && user) return <Navigate to="/app" />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await signIn(email)
      setSignedIn(response.token, response.user)
      await navigate({ to: '/app' })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign you in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.main className="landing" initial="hidden" animate="visible" variants={stagger}>
      <motion.section
        className="landing-story"
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: easeOut }}
      >
        <motion.nav className="landing-nav" variants={fadeUp}>
          <a href="/">
            <BrandMark />
          </a>
          <span>For thoughtful teams</span>
        </motion.nav>
        <motion.div className="landing-copy" variants={stagger}>
          <motion.p className="landing-kicker" variants={fadeUp}>
            <span />
            Your demo workspace is ready
          </motion.p>
          <motion.h1 variants={fadeUp}>
            <span className="hero-line">Ten stories.</span>
            <em className="hero-line">One login.</em>
          </motion.h1>
          <motion.p className="landing-lede" variants={fadeUp}>
            Enter any valid email to open a workspace preloaded with ten surveys that demonstrate
            every question type, branding, analytics, drafts, publishing, and CSV-ready responses.
          </motion.p>
          <motion.div className="proof-row" variants={fadeUp}>
            <div className="avatar-stack" aria-hidden="true">
              {['10', '6', '∞'].map((value, index) => (
                <motion.span
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.65 + index * 0.09,
                    type: 'spring',
                    stiffness: 280,
                    damping: 18,
                  }}
                  key={value}
                >
                  {value}
                </motion.span>
              ))}
            </div>
            <p>
              <strong>Complete demo data</strong>
              surveys · question types · possibilities
            </p>
          </motion.div>
        </motion.div>
        <motion.div className="landing-footer" variants={fadeUp}>
          <span>Designed for clarity</span>
          <span>Built for trust</span>
        </motion.div>
      </motion.section>

      <motion.section
        className="landing-entry"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.65, delay: 0.1 }}
      >
        <motion.div
          className="floating-note note-one"
          initial={{ opacity: 0, y: -18, rotate: 10, scale: 0.85 }}
          animate={
            reducedMotion
              ? { opacity: 1, y: 0, rotate: 4, scale: 1 }
              : { opacity: 1, y: [0, -9, 0], rotate: [4, 6, 4], scale: 1 }
          }
          transition={{
            opacity: { delay: 0.8, duration: 0.3 },
            scale: { delay: 0.8, type: 'spring', stiffness: 260, damping: 18 },
            y: { delay: 1.1, duration: 4.5, repeat: Number.POSITIVE_INFINITY },
            rotate: { delay: 1.1, duration: 4.5, repeat: Number.POSITIVE_INFINITY },
          }}
        >
          <span>Demo surveys</span>
          <strong>10</strong>
          <i>Seeded automatically</i>
        </motion.div>
        <motion.div
          className="floating-note note-two"
          initial={{ opacity: 0, y: 18, rotate: -10, scale: 0.85 }}
          animate={
            reducedMotion
              ? { opacity: 1, y: 0, rotate: -3, scale: 1 }
              : { opacity: 1, y: [0, 8, 0], rotate: [-3, -5, -3], scale: 1 }
          }
          transition={{
            opacity: { delay: 0.95, duration: 0.3 },
            scale: { delay: 0.95, type: 'spring', stiffness: 260, damping: 18 },
            y: { delay: 1.2, duration: 5, repeat: Number.POSITIVE_INFINITY },
            rotate: { delay: 1.2, duration: 5, repeat: Number.POSITIVE_INFINITY },
          }}
        >
          <span className="mini-check">
            <Icon name="check" size={15} />
          </span>
          <p>
            <strong>Analytics included</strong>
            Real D1 response data
          </p>
        </motion.div>
        <motion.div
          className="signin-card"
          initial={{ opacity: 0, y: 38, scale: 0.94, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          transition={{ delay: 0.24, type: 'spring', stiffness: 150, damping: 20, mass: 0.9 }}
        >
          <div className="signin-heading">
            <motion.span
              className="signin-icon"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.62, type: 'spring', stiffness: 300, damping: 17 }}
              whileHover={{ rotate: 8, scale: 1.06 }}
            >
              <Icon name="sparkle" />
            </motion.span>
            <p className="eyebrow">Your workspace awaits</p>
            <h2>Welcome to Luma</h2>
            <p>Use any valid email to create or enter your demo workspace.</p>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Work email</label>
            <div className="input-with-icon">
              <Icon name="mail" size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <AnimatePresence initial={false}>
              {error && (
                <motion.p
                  className="form-error"
                  initial={{ opacity: 0, height: 0, x: -8 }}
                  animate={{ opacity: 1, height: 'auto', x: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.button
              type="submit"
              className="button button-dark button-large"
              disabled={submitting}
              whileHover={
                submitting ? undefined : { y: -2, boxShadow: '0 10px 28px rgba(25,23,20,.2)' }
              }
              whileTap={submitting ? undefined : tapPress}
            >
              {submitting ? 'Preparing demo workspace…' : 'Continue with email'}
              <AnimatePresence mode="popLayout" initial={false}>
                {!submitting && (
                  <motion.span
                    key="arrow"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                  >
                    <Icon name="arrow-right" size={18} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>
          <div className="signin-divider">
            <span />
            <small>No password needed for this demo</small>
            <span />
          </div>
          <p className="signin-terms">
            Demo surveys are added once per account and remain fully editable.
          </p>
        </motion.div>
      </motion.section>
    </motion.main>
  )
}
