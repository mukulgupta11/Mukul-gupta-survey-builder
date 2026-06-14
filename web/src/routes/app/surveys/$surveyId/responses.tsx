import { createFileRoute, Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../../../../components/app-shell'
import { Icon } from '../../../../components/icons'
import { AnimatedNumber, easeOut, fadeUp, hoverLift, stagger } from '../../../../components/motion'
import { apiUrl, getResponses, session } from '../../../../lib/api'
import type { Question, ResponseRecord, Survey } from '../../../../lib/types'

export const Route = createFileRoute('/app/surveys/$surveyId/responses')({
  component: ResponsesPage,
})

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(`${value.replace(' ', 'T')}Z`))

const printable = (value: unknown) =>
  Array.isArray(value) ? value.join(', ') : value === undefined ? '—' : String(value)

function ResponsesPage() {
  const { surveyId } = Route.useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [responses, setResponses] = useState<ResponseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getResponses(surveyId)
      .then((data) => {
        setSurvey(data.survey)
        setResponses(data.responses)
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load responses.'),
      )
      .finally(() => setLoading(false))
  }, [surveyId])

  const insights = useMemo(
    () => (survey ? buildInsights(survey.questions, responses) : []),
    [responses, survey],
  )

  const exportCsv = async () => {
    const response = await fetch(apiUrl(`/api/surveys/${surveyId}/export`), {
      headers: { Authorization: `Bearer ${session.get() ?? ''}` },
    })
    if (!response.ok) {
      setError('Could not export responses.')
      return
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${survey?.slug ?? 'survey'}-responses.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppShell
      eyebrow="Response intelligence"
      title={survey?.title ?? 'Responses'}
      actions={
        <>
          <Link to="/app/surveys/$surveyId" params={{ surveyId }} className="button button-ghost">
            <Icon name="settings" size={16} />
            Edit survey
          </Link>
          <button type="button" className="button button-dark" onClick={exportCsv}>
            <Icon name="download" size={16} />
            Export CSV
          </button>
        </>
      }
    >
      <AnimatePresence>
        {error && (
          <motion.div
            className="inline-error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div
        className="responses-summary"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div className="response-hero-stat" variants={fadeUp} {...hoverLift}>
          <p className="eyebrow">Total responses</p>
          <strong>
            <AnimatedNumber value={responses.length} />
          </strong>
          <span>
            {responses.length ? 'Your audience is speaking.' : 'Share your link to begin.'}
          </span>
        </motion.div>
        <motion.div className="response-mini-stat" variants={fadeUp} {...hoverLift}>
          <span className="stat-icon mint">
            <Icon name="bar-chart" />
          </span>
          <div>
            <strong>
              <AnimatedNumber value={survey?.questions.length ?? 0} />
            </strong>
            <span>Questions</span>
          </div>
        </motion.div>
        <motion.div className="response-mini-stat" variants={fadeUp} {...hoverLift}>
          <span className="stat-icon violet">
            <Icon name="calendar" />
          </span>
          <div>
            <strong>{responses[0] ? formatDate(responses[0].createdAt).split(',')[0] : '—'}</strong>
            <span>Latest response</span>
          </div>
        </motion.div>
      </motion.div>

      {loading ? (
        <motion.div className="responses-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <span className="spinner" />
          Reading the room…
        </motion.div>
      ) : responses.length === 0 ? (
        <motion.section
          className="responses-empty"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: easeOut }}
        >
          <span>
            <Icon name="send" size={28} />
          </span>
          <h2>No responses yet</h2>
          <p>Publish the survey and share its link. The first insight starts with one answer.</p>
          {survey && survey.status === 'published' && (
            <Link to="/s/$slug" params={{ slug: survey.slug }} className="button button-dark">
              Open public survey
              <Icon name="arrow-right" size={16} />
            </Link>
          )}
        </motion.section>
      ) : (
        <>
          {insights.length > 0 && (
            <motion.section
              className="insight-section"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12, ease: easeOut }}
            >
              <div className="section-heading">
                <div>
                  <h2>At a glance</h2>
                  <p>Patterns across choice and rating questions.</p>
                </div>
              </div>
              <motion.div
                className="insight-grid"
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {insights.map((insight) => (
                  <motion.article
                    className="insight-card"
                    key={insight.question.id}
                    variants={fadeUp}
                    {...hoverLift}
                  >
                    <p>{insight.question.title}</p>
                    {insight.average !== undefined ? (
                      <div className="average-display">
                        <strong>
                          <AnimatedNumber value={insight.average} decimals={1} />
                        </strong>
                        <span>out of {insight.question.config.max ?? 5}</span>
                      </div>
                    ) : (
                      <div className="breakdown-list">
                        {insight.counts.map(([label, count]) => (
                          <div key={label}>
                            <span>
                              <b>{label}</b>
                              <i>{count}</i>
                            </span>
                            <motion.em
                              className="breakdown-bar"
                              initial={{ width: 0 }}
                              animate={{
                                width: `${responses.length ? (count / responses.length) * 100 : 0}%`,
                              }}
                              transition={{ duration: 0.7, ease: easeOut }}
                              style={{
                                background: survey?.primaryColor,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.article>
                ))}
              </motion.div>
            </motion.section>
          )}

          <motion.section
            className="response-table-section"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: easeOut }}
          >
            <div className="section-heading">
              <div>
                <h2>Individual responses</h2>
                <p>Newest submissions appear first.</p>
              </div>
              <span className="response-count-badge">{responses.length} total</span>
            </div>
            <div className="response-table-wrap">
              <table className="response-table">
                <thead>
                  <tr>
                    <th>Submitted</th>
                    {survey?.questions.slice(0, 3).map((question) => (
                      <th key={question.id}>{question.title}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody variants={stagger} initial="hidden" animate="visible">
                  {responses.map((response) => (
                    <motion.tr key={response.id} variants={fadeUp}>
                      <td>
                        <strong>{formatDate(response.createdAt)}</strong>
                        <span>#{response.id.slice(0, 6)}</span>
                      </td>
                      {survey?.questions.slice(0, 3).map((question) => (
                        <td key={question.id}>{printable(response.answers[question.id])}</td>
                      ))}
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          </motion.section>
        </>
      )}
    </AppShell>
  )
}

function buildInsights(questions: Question[], responses: ResponseRecord[]) {
  return questions
    .filter((question) => ['single_select', 'multi_select', 'rating'].includes(question.type))
    .slice(0, 3)
    .map((question) => {
      if (question.type === 'rating') {
        const values = responses
          .map((response) => response.answers[question.id])
          .filter((value): value is number => typeof value === 'number')
        return {
          question,
          counts: [] as [string, number][],
          average: values.length
            ? values.reduce((sum, value) => sum + value, 0) / values.length
            : 0,
        }
      }

      const counts = new Map<string, number>()
      for (const option of question.config.options ?? []) counts.set(option, 0)
      for (const response of responses) {
        const value = response.answers[question.id]
        const values = Array.isArray(value) ? value : [value]
        for (const answer of values) {
          if (typeof answer === 'string') counts.set(answer, (counts.get(answer) ?? 0) + 1)
        }
      }
      return { question, counts: [...counts.entries()] }
    })
}
