import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/app-shell'
import { Icon } from '../../components/icons'
import { AnimatedNumber, easeOut, fadeUp, hoverLift, stagger } from '../../components/motion'
import { createSurvey, getSurveys } from '../../lib/api'
import type { SurveySummary } from '../../lib/types'

export const Route = createFileRoute('/app/')({
  component: Dashboard,
})

const formatDate = (value?: string) => {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value.replace(' ', 'T')}Z`))
}

function Dashboard() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSurveys()
      .then((response) => setSurveys(response.surveys))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load surveys.'),
      )
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const responses = surveys.reduce((sum, survey) => sum + survey.responseCount, 0)
    const live = surveys.filter((survey) => survey.status === 'published').length
    return { responses, live }
  }, [surveys])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await createSurvey('Untitled survey')
      await navigate({
        to: '/app/surveys/$surveyId',
        params: { surveyId: response.survey.id },
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create a survey.')
      setCreating(false)
    }
  }

  return (
    <AppShell
      eyebrow="Workspace"
      title="Good afternoon."
      actions={
        <button
          type="button"
          className="button button-dark"
          onClick={handleCreate}
          disabled={creating}
        >
          <Icon name="plus" size={17} />
          {creating ? 'Creating…' : 'New survey'}
        </button>
      }
    >
      <motion.section
        className="dashboard-intro"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.p variants={fadeUp}>
          Here’s what your audience has been telling you. Build something worth answering today.
        </motion.p>
        <motion.div className="stat-strip" variants={stagger}>
          <motion.div variants={fadeUp} whileHover={{ backgroundColor: '#fff' }}>
            <span className="stat-icon coral">
              <Icon name="layers" />
            </span>
            <p>
              <strong>
                <AnimatedNumber value={surveys.length} />
              </strong>
              <span>Total surveys</span>
            </p>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ backgroundColor: '#fff' }}>
            <span className="stat-icon violet">
              <Icon name="send" />
            </span>
            <p>
              <strong>
                <AnimatedNumber value={stats.live} />
              </strong>
              <span>Live now</span>
            </p>
          </motion.div>
          <motion.div variants={fadeUp} whileHover={{ backgroundColor: '#fff' }}>
            <span className="stat-icon mint">
              <Icon name="bar-chart" />
            </span>
            <p>
              <strong>
                <AnimatedNumber value={stats.responses} />
              </strong>
              <span>Total responses</span>
            </p>
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.section
        className="survey-section"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34, duration: 0.6, ease: easeOut }}
      >
        <motion.div className="section-heading" layout>
          <div>
            <h2>Recently updated</h2>
            <p>Your latest conversations, ready to continue.</p>
          </div>
          <Link to="/app/surveys" className="button button-ghost">
            View all surveys
            <Icon name="arrow-right" size={15} />
          </Link>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              className="inline-error"
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        {loading ? (
          <motion.div className="survey-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[0, 1, 2].map((item) => (
              <motion.div
                className="survey-card skeleton-card"
                animate={{ opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, delay: item * 0.12 }}
                key={item}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div className="survey-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {surveys.slice(0, 3).map((survey, index) => (
              <motion.article
                className="survey-card"
                initial={{ opacity: 0, y: 22, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.08 + index * 0.08,
                  ease: easeOut,
                }}
                whileHover={hoverLift}
                layout
                key={survey.id}
              >
                <Link
                  to="/app/surveys/$surveyId"
                  params={{ surveyId: survey.id }}
                  className="survey-card-link"
                >
                  <motion.div
                    className="survey-cover"
                    style={{ '--survey-color': survey.primaryColor } as React.CSSProperties}
                    whileHover={{ scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  >
                    <motion.span
                      className="survey-brand-preview"
                      whileHover={{ rotate: -7, scale: 1.08 }}
                    >
                      {survey.logoUrl ? (
                        <img src={survey.logoUrl} alt="" />
                      ) : (
                        survey.title.slice(0, 1).toUpperCase()
                      )}
                    </motion.span>
                    <div className="cover-lines">
                      <span />
                      <span />
                      <span />
                    </div>
                    <i className="cover-button" />
                  </motion.div>
                  <div className="survey-card-body">
                    <div className="survey-card-title">
                      <h3>{survey.title}</h3>
                      <span className={`status-dot ${survey.status}`} />
                    </div>
                    <p>{survey.description || 'A new conversation is waiting to be shaped.'}</p>
                    <div className="survey-meta">
                      <span>
                        <Icon name="bar-chart" size={14} />
                        {survey.responseCount} responses
                      </span>
                      <span>Edited {formatDate(survey.updatedAt)}</span>
                    </div>
                  </div>
                </Link>
                <Link
                  to="/app/surveys/$surveyId/responses"
                  params={{ surveyId: survey.id }}
                  className="card-corner-action"
                  aria-label={`View ${survey.title} responses`}
                >
                  <Icon name="arrow-right" size={17} />
                </Link>
              </motion.article>
            ))}
            {surveys.length === 0 && (
              <motion.button
                type="button"
                className="create-card dashboard-create-card"
                onClick={handleCreate}
                disabled={creating}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
                whileHover={hoverLift}
                whileTap={{ scale: 0.98 }}
              >
                <motion.span whileHover={{ rotate: 90, scale: 1.08 }}>
                  <Icon name="plus" size={22} />
                </motion.span>
                <strong>Create your first survey</strong>
                <p>Start with a blank canvas</p>
              </motion.button>
            )}
          </motion.div>
        )}
      </motion.section>
    </AppShell>
  )
}
