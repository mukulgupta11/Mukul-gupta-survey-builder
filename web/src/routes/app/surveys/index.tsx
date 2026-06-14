import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../../components/app-shell'
import { Icon } from '../../../components/icons'
import { easeOut, hoverLift, tapPress } from '../../../components/motion'
import { createSurvey, getSurveys } from '../../../lib/api'
import type { SurveySummary } from '../../../lib/types'

export const Route = createFileRoute('/app/surveys/')({
  component: SurveyLibrary,
})

const formatDate = (value?: string) => {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value.replace(' ', 'T')}Z`))
}

function SurveyLibrary() {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
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

  const visibleSurveys = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return surveys.filter(
      (survey) =>
        (filter === 'all' || survey.status === filter) &&
        (!normalizedQuery ||
          survey.title.toLowerCase().includes(normalizedQuery) ||
          survey.description.toLowerCase().includes(normalizedQuery)),
    )
  }, [filter, query, surveys])

  const handleCreate = async () => {
    setCreating(true)
    setError('')
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
      eyebrow="Survey library"
      title="Every conversation."
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
        className="library-toolbar"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.26, duration: 0.5, ease: easeOut }}
      >
        <motion.label
          className="survey-search"
          whileFocus={{ scale: 1.01 }}
          whileHover={{ borderColor: '#c7c1b8' }}
        >
          <Icon name="sparkle" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search surveys"
            aria-label="Search surveys"
          />
        </motion.label>
        <div className="filter-tabs">
          {(['all', 'published', 'draft'] as const).map((value) => (
            <motion.button
              type="button"
              className={filter === value ? 'active' : ''}
              onClick={() => setFilter(value)}
              whileTap={tapPress}
              key={value}
            >
              {filter === value && (
                <motion.i
                  className="filter-active-pill"
                  layoutId="survey-filter-active"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <b>{value === 'all' ? 'All' : value === 'published' ? 'Published' : 'Drafts'}</b>
              <span>
                {value === 'all'
                  ? surveys.length
                  : surveys.filter((survey) => survey.status === value).length}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.section>

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
        <motion.div
          className="survey-grid library-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <motion.div
              className="survey-card skeleton-card"
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, delay: item * 0.08 }}
              key={item}
            />
          ))}
        </motion.div>
      ) : visibleSurveys.length === 0 ? (
        <motion.section
          className="library-empty"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <span>
            <Icon name="layers" size={24} />
          </span>
          <h2>No surveys match that view.</h2>
          <p>Try another search or change the status filter.</p>
        </motion.section>
      ) : (
        <motion.div className="survey-grid library-grid" layout>
          <AnimatePresence mode="popLayout">
            {visibleSurveys.map((survey, index) => (
              <motion.article
                className="survey-card"
                layout
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -12 }}
                transition={{
                  layout: { type: 'spring', stiffness: 310, damping: 30 },
                  opacity: { duration: 0.24 },
                  delay: Math.min(index * 0.035, 0.25),
                }}
                whileHover={hoverLift}
                key={survey.id}
              >
                <Link
                  to="/app/surveys/$surveyId"
                  params={{ surveyId: survey.id }}
                  className="survey-card-link"
                >
                  <motion.div
                    className="survey-cover"
                    style={{ '--survey-color': survey.primaryColor } as CSSProperties}
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
                    <span className={`cover-status ${survey.status}`}>
                      {survey.status === 'published' ? 'Live' : 'Draft'}
                    </span>
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
          </AnimatePresence>
        </motion.div>
      )}
    </AppShell>
  )
}
