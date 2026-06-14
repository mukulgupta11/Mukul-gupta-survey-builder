import { createFileRoute, Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { type CSSProperties, type DragEvent, useEffect, useMemo, useState } from 'react'
import { BrandMark, LoadingScreen } from '../../../../components/app-shell'
import { Icon } from '../../../../components/icons'
import { easeOut, tapPress } from '../../../../components/motion'
import { getSurvey, updateSurvey } from '../../../../lib/api'
import type { Question, QuestionType, Survey } from '../../../../lib/types'

export const Route = createFileRoute('/app/surveys/$surveyId/')({
  component: SurveyBuilder,
})

const questionTypeMeta: Record<
  QuestionType,
  { label: string; helper: string; icon: 'type' | 'list' | 'bar-chart' | 'calendar' }
> = {
  short_text: { label: 'Short answer', helper: 'Names, emails, quick thoughts', icon: 'type' },
  long_text: { label: 'Long answer', helper: 'Detailed, open-ended feedback', icon: 'type' },
  single_select: { label: 'Single select', helper: 'Choose one from a list', icon: 'list' },
  multi_select: { label: 'Multi select', helper: 'Choose several options', icon: 'list' },
  rating: { label: 'Rating scale', helper: 'Measure sentiment from 1–5', icon: 'bar-chart' },
  date: { label: 'Date', helper: 'Collect a calendar date', icon: 'calendar' },
}

const createQuestion = (type: QuestionType): Question => ({
  id: crypto.randomUUID(),
  type,
  title:
    type === 'rating'
      ? 'How would you rate your experience?'
      : type === 'date'
        ? 'Which date works best?'
        : 'Your next question',
  description: '',
  required: false,
  config:
    type === 'rating'
      ? { max: 5 }
      : type === 'single_select' || type === 'multi_select'
        ? { options: ['Option one', 'Option two', 'Option three'] }
        : {},
})

function SurveyBuilder() {
  const { surveyId } = Route.useParams()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [panel, setPanel] = useState<'question' | 'design'>('question')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  useEffect(() => {
    getSurvey(surveyId)
      .then((response) => {
        setSurvey(response.survey)
        setSelectedId(response.survey.questions[0]?.id ?? '')
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load this survey.'),
      )
      .finally(() => setLoading(false))
  }, [surveyId])

  const selectedQuestion = useMemo(
    () => survey?.questions.find((question) => question.id === selectedId) ?? null,
    [selectedId, survey],
  )

  if (loading) return <LoadingScreen label="Opening the builder" />
  if (!survey) {
    return (
      <div className="centered-message">
        <h1>We couldn’t open this survey.</h1>
        <p>{error}</p>
        <Link to="/app" className="button button-dark">
          Back to workspace
        </Link>
      </div>
    )
  }

  const setSurveyField = <K extends keyof Survey>(key: K, value: Survey[K]) => {
    setSurvey((current) => (current ? { ...current, [key]: value } : current))
    setDirty(true)
  }

  const updateQuestion = (updates: Partial<Question>) => {
    setSurvey((current) =>
      current
        ? {
            ...current,
            questions: current.questions.map((question) =>
              question.id === selectedId ? { ...question, ...updates } : question,
            ),
          }
        : current,
    )
    setDirty(true)
  }

  const handleSave = async (nextStatus = survey.status) => {
    setSaving(true)
    setError('')
    try {
      const response = await updateSurvey({ ...survey, status: nextStatus })
      setSurvey(response.survey)
      setDirty(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  const addQuestion = (type: QuestionType) => {
    const question = createQuestion(type)
    setSurvey((current) =>
      current ? { ...current, questions: [...current.questions, question] } : current,
    )
    setSelectedId(question.id)
    setPanel('question')
    setDirty(true)
  }

  const removeQuestion = () => {
    if (survey.questions.length === 1 || !selectedQuestion) return
    const currentIndex = survey.questions.findIndex((question) => question.id === selectedId)
    const questions = survey.questions.filter((question) => question.id !== selectedId)
    setSurvey({ ...survey, questions })
    setSelectedId(questions[Math.max(0, currentIndex - 1)]?.id ?? questions[0]?.id ?? '')
    setDirty(true)
  }

  const moveQuestion = (fromId: string, toId: string) => {
    if (fromId === toId) return
    const next = [...survey.questions]
    const fromIndex = next.findIndex((question) => question.id === fromId)
    const toIndex = next.findIndex((question) => question.id === toId)
    const [moved] = next.splice(fromIndex, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)
    setSurvey({ ...survey, questions: next })
    setDirty(true)
  }

  const nudgeQuestion = (direction: -1 | 1) => {
    const index = survey.questions.findIndex((question) => question.id === selectedId)
    const target = survey.questions[index + direction]
    if (target) moveQuestion(selectedId, target.id)
  }

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault()
    if (draggedId) moveQuestion(draggedId, targetId)
    setDraggedId(null)
  }

  const copyShareLink = async () => {
    const url = `${window.location.origin}/s/${survey.slug}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <motion.div
      className="builder-shell"
      style={{ '--brand': survey.primaryColor } as CSSProperties}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <motion.header
        className="builder-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <div className="builder-header-left">
          <Link to="/app" className="icon-button" aria-label="Back to workspace">
            <Icon name="arrow-left" />
          </Link>
          <BrandMark compact />
          <span className="header-divider" />
          <input
            className="survey-title-input"
            value={survey.title}
            onChange={(event) => setSurveyField('title', event.target.value)}
            aria-label="Survey title"
          />
        </div>
        <div className="save-state">
          <span className={dirty ? 'unsaved' : 'saved'} />
          {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All changes saved'}
        </div>
        <div className="builder-actions">
          <button type="button" className="button button-ghost" onClick={copyShareLink}>
            <Icon name={copied ? 'check' : 'copy'} size={16} />
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <Link
            to="/s/$slug"
            params={{ slug: survey.slug }}
            target="_blank"
            className="button button-ghost"
            disabled={survey.status === 'draft'}
          >
            Preview
          </Link>
          {dirty && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => handleSave()}
              disabled={saving}
            >
              Save
            </button>
          )}
          <button
            type="button"
            className="button button-dark"
            onClick={() => handleSave('published')}
            disabled={saving}
          >
            <Icon name="send" size={16} />
            {survey.status === 'published' ? 'Publish changes' : 'Publish'}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {error && (
          <motion.div
            className="builder-error"
            initial={{ opacity: 0, y: -10, scaleY: 0.8 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -8, scaleY: 0.85 }}
          >
            {error}
            <button type="button" onClick={() => setError('')} aria-label="Dismiss error">
              <Icon name="x" size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="builder-workspace"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.48, delay: 0.08, ease: easeOut }}
      >
        <motion.aside
          className="question-rail"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: easeOut }}
        >
          <div className="rail-heading">
            <div>
              <span>Questions</span>
              <small>{survey.questions.length}</small>
            </div>
            <button
              type="button"
              className="icon-button small"
              onClick={() => addQuestion('short_text')}
              aria-label="Add question"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
          <motion.div className="question-list" layout>
            <AnimatePresence initial={false}>
              {survey.questions.map((question, index) => (
                <motion.button
                  type="button"
                  key={question.id}
                  className={`question-list-item ${selectedId === question.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedId(question.id)
                    setPanel('question')
                  }}
                  draggable
                  onDragStart={() => setDraggedId(question.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleDrop(event, question.id)}
                  layout
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12, height: 0 }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ duration: 0.22, ease: easeOut }}
                >
                  {selectedId === question.id && (
                    <motion.span
                      className="question-active-indicator"
                      layoutId="question-active-indicator"
                      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                    />
                  )}
                  <Icon name="grip" size={15} className="drag-grip" />
                  <span className="question-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="question-list-copy">
                    <strong>{question.title || 'Untitled question'}</strong>
                    <small>{questionTypeMeta[question.type].label}</small>
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
          <div className="add-question-panel">
            <p>Add question</p>
            <div className="question-type-grid">
              {(Object.keys(questionTypeMeta) as QuestionType[]).map((type) => (
                <button type="button" key={type} onClick={() => addQuestion(type)}>
                  <Icon name={questionTypeMeta[type].icon} size={15} />
                  {questionTypeMeta[type].label}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>

        <motion.main
          className="builder-canvas"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.14, ease: easeOut }}
        >
          <div className="canvas-toolbar">
            <span>Live canvas</span>
            <div>
              <span className="desktop-toggle">
                <Icon name="layers" size={14} />
                Desktop
              </span>
              <span>{survey.questions.length} questions</span>
            </div>
          </div>
          <div className="survey-preview-wrap">
            <div className="survey-preview">
              <div className="preview-brand">
                {survey.logoUrl ? (
                  <img src={survey.logoUrl} alt="Survey logo" />
                ) : (
                  <span>{survey.title.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="preview-intro">
                <h2>{survey.title || 'Untitled survey'}</h2>
                <p>{survey.description || 'Add a short introduction in the design panel.'}</p>
              </div>
              <div className="preview-progress">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: '28%' }}
                  transition={{ duration: 0.8, delay: 0.35, ease: easeOut }}
                />
              </div>
              <AnimatePresence initial={false}>
                {survey.questions.map((question, index) => (
                  <motion.button
                    type="button"
                    className={`preview-question ${question.id === selectedId ? 'selected' : ''}`}
                    key={question.id}
                    onClick={() => {
                      setSelectedId(question.id)
                      setPanel('question')
                    }}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    whileHover={{ y: -2 }}
                    {...tapPress}
                  >
                    {question.id === selectedId && (
                      <motion.span
                        className="preview-selection-ring"
                        layoutId="preview-selection-ring"
                        transition={{ type: 'spring', stiffness: 330, damping: 30 }}
                      />
                    )}
                    <span className="preview-question-number">{index + 1}</span>
                    <div>
                      <h3>
                        {question.title || 'Untitled question'}
                        {question.required && <sup>*</sup>}
                      </h3>
                      {question.description && <p>{question.description}</p>}
                      <QuestionPreview question={question} />
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              <div className="preview-footer">
                <span>Made with Luma</span>
                <i />
              </div>
            </div>
          </div>
        </motion.main>

        <motion.aside
          className="property-panel"
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: easeOut }}
        >
          <div className="property-tabs">
            <button
              type="button"
              className={panel === 'question' ? 'active' : ''}
              onClick={() => setPanel('question')}
            >
              <Icon name="settings" size={15} />
              Question
            </button>
            <button
              type="button"
              className={panel === 'design' ? 'active' : ''}
              onClick={() => setPanel('design')}
            >
              <Icon name="palette" size={15} />
              Design
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={panel === 'question' && selectedQuestion ? selectedQuestion.id : 'design'}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: easeOut }}
            >
              {panel === 'question' && selectedQuestion ? (
                <QuestionEditor
                  question={selectedQuestion}
                  updateQuestion={updateQuestion}
                  removeQuestion={removeQuestion}
                  canRemove={survey.questions.length > 1}
                  moveUp={() => nudgeQuestion(-1)}
                  moveDown={() => nudgeQuestion(1)}
                />
              ) : (
                <DesignEditor survey={survey} setSurveyField={setSurveyField} />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.aside>
      </motion.div>
    </motion.div>
  )
}

function QuestionPreview({ question }: { question: Question }) {
  if (question.type === 'long_text') {
    return <span className="mock-input mock-textarea">Type your answer here…</span>
  }
  if (question.type === 'single_select' || question.type === 'multi_select') {
    return (
      <span className="mock-options">
        {(question.config.options ?? []).slice(0, 4).map((option, index) => (
          <i key={option}>
            <b>{String.fromCharCode(65 + index)}</b>
            {option}
          </i>
        ))}
      </span>
    )
  }
  if (question.type === 'rating') {
    return (
      <span className="mock-rating">
        {Array.from({ length: question.config.max ?? 5 }, (_, index) => index + 1).map((rating) => (
          <i key={rating}>{rating}</i>
        ))}
      </span>
    )
  }
  if (question.type === 'date') {
    return (
      <span className="mock-input">
        <Icon name="calendar" size={15} />
        Select a date
      </span>
    )
  }
  return <span className="mock-input">Type your answer here…</span>
}

function QuestionEditor({
  question,
  updateQuestion,
  removeQuestion,
  canRemove,
  moveUp,
  moveDown,
}: {
  question: Question
  updateQuestion: (updates: Partial<Question>) => void
  removeQuestion: () => void
  canRemove: boolean
  moveUp: () => void
  moveDown: () => void
}) {
  const setOption = (index: number, value: string) => {
    const options = [...(question.config.options ?? [])]
    options[index] = value
    updateQuestion({ config: { ...question.config, options } })
  }

  const removeOption = (index: number) => {
    const options = (question.config.options ?? []).filter(
      (_, optionIndex) => optionIndex !== index,
    )
    updateQuestion({ config: { ...question.config, options } })
  }

  return (
    <div className="property-content">
      <div className="property-heading">
        <div>
          <p className="eyebrow">Question settings</p>
          <h3>Shape the prompt</h3>
        </div>
        <div className="nudge-controls">
          <button type="button" onClick={moveUp} aria-label="Move question up">
            <Icon name="chevron-up" size={15} />
          </button>
          <button type="button" onClick={moveDown} aria-label="Move question down">
            <Icon name="chevron-down" size={15} />
          </button>
        </div>
      </div>

      <label className="field">
        <span>Question type</span>
        <select
          value={question.type}
          onChange={(event) => {
            const type = event.target.value as QuestionType
            const fresh = createQuestion(type)
            updateQuestion({ type, config: fresh.config })
          }}
        >
          {(Object.keys(questionTypeMeta) as QuestionType[]).map((type) => (
            <option value={type} key={type}>
              {questionTypeMeta[type].label}
            </option>
          ))}
        </select>
        <small>{questionTypeMeta[question.type].helper}</small>
      </label>

      <label className="field">
        <span>Question</span>
        <textarea
          rows={3}
          value={question.title}
          onChange={(event) => updateQuestion({ title: event.target.value })}
          placeholder="What would you like to ask?"
        />
      </label>

      <label className="field">
        <span>
          Description <i>Optional</i>
        </span>
        <textarea
          rows={2}
          value={question.description}
          onChange={(event) => updateQuestion({ description: event.target.value })}
          placeholder="Add context or a helpful hint"
        />
      </label>

      {(question.type === 'single_select' || question.type === 'multi_select') && (
        <div className="field">
          <span>Answer options</span>
          <div className="option-editor">
            {(question.config.options ?? []).map((option, index) => (
              <div key={`${question.id}-${option}`}>
                <b>{String.fromCharCode(65 + index)}</b>
                <input value={option} onChange={(event) => setOption(index, event.target.value)} />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  aria-label={`Remove ${option}`}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-option"
              onClick={() =>
                updateQuestion({
                  config: {
                    ...question.config,
                    options: [...(question.config.options ?? []), 'New option'],
                  },
                })
              }
            >
              <Icon name="plus" size={14} />
              Add option
            </button>
          </div>
        </div>
      )}

      {question.type === 'rating' && (
        <label className="field">
          <span>Scale</span>
          <select
            value={question.config.max ?? 5}
            onChange={(event) =>
              updateQuestion({ config: { ...question.config, max: Number(event.target.value) } })
            }
          >
            <option value={5}>1 to 5</option>
            <option value={7}>1 to 7</option>
            <option value={10}>1 to 10</option>
          </select>
        </label>
      )}

      <div className="toggle-row">
        <div>
          <strong>Required answer</strong>
          <span>Respondents must answer to continue</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={question.required}
          className={`switch ${question.required ? 'on' : ''}`}
          onClick={() => updateQuestion({ required: !question.required })}
        >
          <span />
        </button>
      </div>

      <button
        type="button"
        className="danger-action"
        onClick={removeQuestion}
        disabled={!canRemove}
      >
        <Icon name="trash" size={16} />
        Delete question
      </button>
    </div>
  )
}

function DesignEditor({
  survey,
  setSurveyField,
}: {
  survey: Survey
  setSurveyField: <K extends keyof Survey>(key: K, value: Survey[K]) => void
}) {
  const colors = ['#E85D3F', '#6C5CE7', '#167D6D', '#2358C7', '#C63C75', '#1F1F1D']

  return (
    <div className="property-content">
      <div className="property-heading">
        <div>
          <p className="eyebrow">Brand settings</p>
          <h3>Make it unmistakably yours</h3>
        </div>
      </div>
      <label className="field">
        <span>Introduction</span>
        <textarea
          rows={4}
          value={survey.description}
          onChange={(event) => setSurveyField('description', event.target.value)}
          placeholder="Tell respondents why their answer matters."
        />
      </label>
      <div className="field">
        <span>Primary color</span>
        <div className="color-picker-row">
          {colors.map((color) => (
            <button
              type="button"
              key={color}
              className={survey.primaryColor === color ? 'active' : ''}
              style={{ backgroundColor: color }}
              onClick={() => setSurveyField('primaryColor', color)}
              aria-label={`Use ${color}`}
            >
              {survey.primaryColor === color && <Icon name="check" size={14} />}
            </button>
          ))}
          <label className="custom-color">
            <input
              type="color"
              value={survey.primaryColor}
              onChange={(event) => setSurveyField('primaryColor', event.target.value)}
            />
            <Icon name="plus" size={14} />
          </label>
        </div>
      </div>
      <label className="field">
        <span>
          Logo URL <i>Optional</i>
        </span>
        <div className="input-with-button">
          <Icon name="image" size={16} />
          <input
            type="url"
            value={survey.logoUrl}
            onChange={(event) => setSurveyField('logoUrl', event.target.value)}
            placeholder="https://yourbrand.com/logo.png"
          />
        </div>
        <small>Use a square or horizontal PNG with a transparent background.</small>
      </label>
      <div className="brand-sample">
        <span style={{ background: survey.primaryColor }}>
          {survey.logoUrl ? <img src={survey.logoUrl} alt="" /> : survey.title.slice(0, 1)}
        </span>
        <div>
          <strong>{survey.title}</strong>
          <small>Respondent view</small>
        </div>
      </div>
    </div>
  )
}
