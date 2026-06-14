import { createFileRoute, Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, type FormEvent, useEffect, useState } from 'react'
import { BrandMark } from '../../components/app-shell'
import { Icon } from '../../components/icons'
import { easeOut, tapPress } from '../../components/motion'
import { getPublicSurvey, submitResponse } from '../../lib/api'
import type { Question, Survey } from '../../lib/types'

export const Route = createFileRoute('/s/$slug')({
  component: PublicSurvey,
})

const questionVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 44,
    filter: 'blur(7px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -30,
    filter: 'blur(5px)',
  }),
}

function PublicSurvey() {
  const { slug } = Route.useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [complete, setComplete] = useState(false)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    getPublicSurvey(slug)
      .then((response) => setSurvey(response.survey))
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'This survey is unavailable.'),
      )
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="public-loading">
        <span className="spinner" />
        <p>Preparing your survey…</p>
      </div>
    )
  }

  if (!survey) {
    return (
      <main className="public-not-found">
        <BrandMark />
        <div>
          <span className="empty-orbit">404</span>
          <h1>This conversation isn’t open.</h1>
          <p>{error || 'The survey may still be a draft or the link has changed.'}</p>
        </div>
        <Link to="/" className="button button-dark">
          Visit Luma
        </Link>
      </main>
    )
  }

  const question = survey.questions[step]
  const progress = complete ? 100 : started ? ((step + 1) / survey.questions.length) * 100 : 0

  const isEmpty = (value: unknown) =>
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)

  const advance = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!question) return
    if (question.required && isEmpty(answers[question.id])) {
      setError('This one needs an answer before you continue.')
      return
    }
    setError('')
    if (step < survey.questions.length - 1) {
      setDirection(1)
      setStep((current) => current + 1)
      return
    }

    setSubmitting(true)
    try {
      await submitResponse(slug, answers)
      setComplete(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit your response.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="public-survey" style={{ '--brand': survey.primaryColor } as CSSProperties}>
      <div className="public-progress">
        <motion.span
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 110, damping: 22, mass: 0.8 }}
        />
      </div>
      <motion.header
        className="public-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <SurveyLogo survey={survey} />
        <AnimatePresence mode="wait">
          {started && !complete && (
            <motion.span
              key={step}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              {String(step + 1).padStart(2, '0')} /{' '}
              {String(survey.questions.length).padStart(2, '0')}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.header>

      <AnimatePresence mode="wait" custom={direction}>
        {!started ? (
          <motion.section
            className="public-welcome"
            key="welcome"
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
            transition={{ duration: 0.5, ease: easeOut }}
          >
            <p className="public-eyebrow">A few thoughtful questions</p>
            <h1>{survey.title}</h1>
            <p>
              {survey.description || 'Thanks for making a little time. Your perspective matters.'}
            </p>
            <motion.button
              type="button"
              className="public-button"
              onClick={() => {
                setDirection(1)
                setStarted(true)
              }}
              whileHover={{ y: -3, scale: 1.015 }}
              {...tapPress}
            >
              Begin
              <Icon name="arrow-right" />
            </motion.button>
            <small>About {Math.max(1, Math.ceil(survey.questions.length * 0.35))} min</small>
          </motion.section>
        ) : complete ? (
          <motion.section
            className="public-complete"
            key="complete"
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
            transition={{ duration: 0.55, ease: easeOut }}
          >
            <motion.div
              className="success-rings"
              initial={{ opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.08 }}
            >
              <motion.span
                initial={{ scale: 0, rotate: -35 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 17, delay: 0.22 }}
              >
                <Icon name="check" size={32} />
              </motion.span>
            </motion.div>
            <p className="public-eyebrow">Response received</p>
            <h1>That’s everything.</h1>
            <p>Thank you for sharing your point of view. It’s safely with the team now.</p>
            <div className="complete-signoff">
              <SurveyLogo survey={survey} />
              <span>{survey.title}</span>
            </div>
          </motion.section>
        ) : question ? (
          <motion.form
            className="public-question"
            key={question.id}
            onSubmit={advance}
            variants={questionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            custom={direction}
            transition={{ duration: 0.42, ease: easeOut }}
          >
            <div className="question-count">{String(step + 1).padStart(2, '0')}</div>
            <div className="public-question-copy">
              <h1>
                {question.title}
                {question.required && <sup>*</sup>}
              </h1>
              {question.description && <p>{question.description}</p>}
            </div>
            <AnswerField
              question={question}
              value={answers[question.id]}
              onChange={(value) => {
                setAnswers((current) => ({ ...current, [question.id]: value }))
                setError('')
              }}
            />
            <AnimatePresence>
              {error && (
                <motion.p
                  className="public-error"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="public-navigation">
              <motion.button
                type="submit"
                className="public-button"
                disabled={submitting}
                whileHover={{ y: -2, scale: 1.012 }}
                {...tapPress}
              >
                {submitting
                  ? 'Sending…'
                  : step === survey.questions.length - 1
                    ? 'Submit response'
                    : 'Continue'}
                {!submitting && <Icon name="arrow-right" size={18} />}
              </motion.button>
              {step > 0 && (
                <motion.button
                  type="button"
                  className="public-back"
                  onClick={() => {
                    setDirection(-1)
                    setStep(step - 1)
                  }}
                  whileHover={{ x: -3 }}
                  {...tapPress}
                >
                  <Icon name="arrow-left" size={16} />
                  Back
                </motion.button>
              )}
              <span>
                press <kbd>Enter ↵</kbd>
              </span>
            </div>
          </motion.form>
        ) : null}
      </AnimatePresence>

      <motion.footer
        className="public-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <span>Made with</span>
        <BrandMark />
      </motion.footer>
    </main>
  )
}

function SurveyLogo({ survey }: { survey: Survey }) {
  return (
    <motion.div
      className="public-logo"
      whileHover={{ rotate: -3, scale: 1.04 }}
      transition={{ type: 'spring', stiffness: 280, damping: 18 }}
    >
      {survey.logoUrl ? (
        <img src={survey.logoUrl} alt={`${survey.title} logo`} />
      ) : (
        <span>{survey.title.slice(0, 1).toUpperCase()}</span>
      )}
    </motion.div>
  )
}

function AnswerField({
  question,
  value,
  onChange,
}: {
  question: Question
  value: unknown
  onChange: (value: unknown) => void
}) {
  if (question.type === 'long_text') {
    return (
      <textarea
        className="public-text-input public-textarea"
        rows={4}
        placeholder="Take your time…"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  if (question.type === 'short_text') {
    return (
      <input
        className="public-text-input"
        placeholder="Type your answer here…"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  if (question.type === 'date') {
    return (
      <input
        className="public-text-input public-date-input"
        type="date"
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  if (question.type === 'rating') {
    return (
      <div className="public-rating" role="radiogroup" aria-label={question.title}>
        {Array.from({ length: question.config.max ?? 5 }, (_, index) => index + 1).map((rating) => (
          <motion.button
            type="button"
            aria-pressed={value === rating}
            className={value === rating ? 'selected' : ''}
            key={rating}
            onClick={() => onChange(rating)}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.92 }}
            animate={{ scale: value === rating ? 1.07 : 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          >
            {rating}
          </motion.button>
        ))}
        <div>
          <span>Not for me</span>
          <span>Loved it</span>
        </div>
      </div>
    )
  }

  const selected = Array.isArray(value) ? value : []
  return (
    <div className="public-options">
      {(question.config.options ?? []).map((option, index) => {
        const isSelected =
          question.type === 'multi_select' ? selected.includes(option) : value === option
        return (
          <motion.button
            type="button"
            className={isSelected ? 'selected' : ''}
            key={option}
            onClick={() => {
              if (question.type === 'multi_select') {
                onChange(
                  isSelected ? selected.filter((item) => item !== option) : [...selected, option],
                )
              } else {
                onChange(option)
              }
            }}
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.985 }}
            layout
          >
            <b>{String.fromCharCode(65 + index)}</b>
            <span>{option}</span>
            <i>
              <AnimatePresence>
                {isSelected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.3 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                  >
                    <Icon name="check" size={15} />
                  </motion.span>
                )}
              </AnimatePresence>
            </i>
          </motion.button>
        )
      })}
    </div>
  )
}
