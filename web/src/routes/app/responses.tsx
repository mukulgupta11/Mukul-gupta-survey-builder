import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../components/app-shell'
import { Icon } from '../../components/icons'
import { AnimatedNumber, easeOut, fadeUp, hoverLift, stagger } from '../../components/motion'
import { getSurveys } from '../../lib/api'
import type { SurveySummary } from '../../lib/types'

export const Route = createFileRoute('/app/responses')({
  component: ResponseHub,
})

function ResponseHub() {
  const [surveys, setSurveys] = useState<SurveySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getSurveys()
      .then((response) => setSurveys(response.surveys))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load response data.'),
      )
      .finally(() => setLoading(false))
  }, [])

  const ranked = useMemo(
    () => [...surveys].sort((left, right) => right.responseCount - left.responseCount),
    [surveys],
  )
  const totalResponses = surveys.reduce((total, survey) => total + survey.responseCount, 0)
  const activeSurveys = surveys.filter((survey) => survey.responseCount > 0).length
  const average = activeSurveys ? totalResponses / activeSurveys : 0
  const maxResponses = Math.max(...surveys.map((survey) => survey.responseCount), 1)

  return (
    <AppShell eyebrow="Response hub" title="Hear the signal.">
      {error && (
        <motion.div
          className="inline-error"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}
      <motion.section
        className="response-hub-stats"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.article variants={fadeUp} {...hoverLift}>
          <span className="stat-icon coral">
            <Icon name="bar-chart" />
          </span>
          <p>
            <strong>
              <AnimatedNumber value={totalResponses} />
            </strong>
            <span>Total responses</span>
          </p>
        </motion.article>
        <motion.article variants={fadeUp} {...hoverLift}>
          <span className="stat-icon violet">
            <Icon name="layers" />
          </span>
          <p>
            <strong>
              <AnimatedNumber value={activeSurveys} />
            </strong>
            <span>Surveys with signal</span>
          </p>
        </motion.article>
        <motion.article variants={fadeUp} {...hoverLift}>
          <span className="stat-icon mint">
            <Icon name="sparkle" />
          </span>
          <p>
            <strong>
              <AnimatedNumber value={average} decimals={1} />
            </strong>
            <span>Average per active survey</span>
          </p>
        </motion.article>
      </motion.section>

      <motion.section
        className="response-hub-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.16, ease: easeOut }}
      >
        <div className="section-heading">
          <div>
            <h2>Response activity</h2>
            <p>Open any survey to see breakdowns, individual answers, and CSV export.</p>
          </div>
        </div>
        {loading ? (
          <div className="response-hub-list">
            {[0, 1, 2, 3].map((item) => (
              <motion.div
                className="response-hub-row skeleton-card"
                key={item}
                animate={{ opacity: [0.45, 0.9, 0.45] }}
                transition={{ duration: 1.4, delay: item * 0.08, repeat: Number.POSITIVE_INFINITY }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="response-hub-list"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {ranked.map((survey, index) => (
              <motion.div
                key={survey.id}
                variants={fadeUp}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.22, ease: easeOut }}
              >
                <Link
                  to="/app/surveys/$surveyId/responses"
                  params={{ surveyId: survey.id }}
                  className="response-hub-row"
                >
                  <span className="response-rank">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    className="response-brand-dot"
                    style={{ backgroundColor: survey.primaryColor }}
                  />
                  <div className="response-hub-copy">
                    <strong>{survey.title}</strong>
                    <span>{survey.status === 'published' ? 'Published' : 'Draft'}</span>
                  </div>
                  <div className="response-volume">
                    <span>
                      <motion.i
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(survey.responseCount / maxResponses) * 100}%`,
                        }}
                        transition={{
                          duration: 0.65,
                          delay: 0.18 + index * 0.04,
                          ease: easeOut,
                        }}
                        style={{ backgroundColor: survey.primaryColor }}
                      />
                    </span>
                    <strong>
                      <AnimatedNumber value={survey.responseCount} />
                    </strong>
                  </div>
                  <Icon name="arrow-right" size={17} />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>
    </AppShell>
  )
}
