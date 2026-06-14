import { Hono, type MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'rating'
  | 'date'

type QuestionInput = {
  id: string
  type: QuestionType
  title: string
  description: string
  required: boolean
  config: {
    options?: string[]
    max?: number
  }
}

type SurveyInput = {
  title: string
  description: string
  primaryColor: string
  logoUrl: string
  status: 'draft' | 'published'
  questions: QuestionInput[]
}

type AuthUser = {
  id: string
  email: string
}

type DemoQuestion = Omit<QuestionInput, 'id'>

type DemoSurvey = {
  title: string
  description: string
  primaryColor: string
  logoUrl?: string
  status: 'draft' | 'published'
  questions: DemoQuestion[]
  responses: unknown[][]
}

type AppVariables = {
  user: AuthUser
}

type AppBindings = Env & {
  CORS_ORIGIN?: string
}

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>()

app.use('/api/*', async (c, next) => {
  const allowedOrigins = (c.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  const corsMiddleware = cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : (allowedOrigins[0] ?? '')),
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })
  return corsMiddleware(c, next)
})

const questionTypes = new Set<QuestionType>([
  'short_text',
  'long_text',
  'single_select',
  'multi_select',
  'rating',
  'date',
])

const jsonError = (message: string, status: 400 | 401 | 403 | 404 | 409 | 500 = 400) =>
  ({ message, status }) as const

const parseJson = <T>(value: string): T => JSON.parse(value) as T

const slugify = (title: string) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 42)
  return `${base || 'untitled'}-${crypto.randomUUID().slice(0, 6)}`
}

const getToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice(7)
}

const auth: MiddlewareHandler<{ Bindings: Env; Variables: AppVariables }> = async (c, next) => {
  const token = getToken(c.req.header('Authorization'))
  if (!token) {
    const error = jsonError('Sign in to continue.', 401)
    return c.json({ error: error.message }, error.status)
  }

  const user = await c.env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ? AND sessions.expires_at > datetime('now')`,
  )
    .bind(token)
    .first<AuthUser>()

  if (!user) {
    const error = jsonError('Your session has expired. Please sign in again.', 401)
    return c.json({ error: error.message }, error.status)
  }

  c.set('user', user)
  await next()
}

const validateSurvey = (body: unknown): SurveyInput | null => {
  if (!body || typeof body !== 'object') return null
  const input = body as Record<string, unknown>
  if (
    typeof input.title !== 'string' ||
    typeof input.description !== 'string' ||
    typeof input.primaryColor !== 'string' ||
    typeof input.logoUrl !== 'string' ||
    (input.status !== 'draft' && input.status !== 'published') ||
    !Array.isArray(input.questions)
  ) {
    return null
  }

  const questions: QuestionInput[] = []
  for (const candidate of input.questions) {
    if (!candidate || typeof candidate !== 'object') return null
    const question = candidate as Record<string, unknown>
    if (
      typeof question.id !== 'string' ||
      typeof question.type !== 'string' ||
      !questionTypes.has(question.type as QuestionType) ||
      typeof question.title !== 'string' ||
      typeof question.description !== 'string' ||
      typeof question.required !== 'boolean' ||
      !question.config ||
      typeof question.config !== 'object'
    ) {
      return null
    }

    const config = question.config as Record<string, unknown>
    if (
      config.options !== undefined &&
      (!Array.isArray(config.options) ||
        config.options.some((option) => typeof option !== 'string'))
    ) {
      return null
    }
    if (config.max !== undefined && typeof config.max !== 'number') return null

    questions.push({
      id: question.id,
      type: question.type as QuestionType,
      title: question.title,
      description: question.description,
      required: question.required,
      config: {
        options: config.options as string[] | undefined,
        max: config.max as number | undefined,
      },
    })
  }

  return {
    title: input.title.trim().slice(0, 120),
    description: input.description.trim().slice(0, 500),
    primaryColor: /^#[0-9a-f]{6}$/i.test(input.primaryColor) ? input.primaryColor : '#6C5CE7',
    logoUrl: input.logoUrl.trim().slice(0, 500),
    status: input.status,
    questions,
  }
}

const getOwnedSurvey = async (db: D1Database, surveyId: string, ownerId: string) => {
  const survey = await db
    .prepare(
      `SELECT id, title, description, slug, primary_color, logo_url, status, created_at, updated_at
       FROM surveys WHERE id = ? AND owner_id = ?`,
    )
    .bind(surveyId, ownerId)
    .first<{
      id: string
      title: string
      description: string
      slug: string
      primary_color: string
      logo_url: string
      status: 'draft' | 'published'
      created_at: string
      updated_at: string
    }>()

  if (!survey) return null

  const questions = await db
    .prepare(
      `SELECT id, type, title, description, required, config
       FROM questions WHERE survey_id = ? ORDER BY position ASC`,
    )
    .bind(surveyId)
    .all<{
      id: string
      type: QuestionType
      title: string
      description: string
      required: number
      config: string
    }>()

  return {
    id: survey.id,
    title: survey.title,
    description: survey.description,
    slug: survey.slug,
    primaryColor: survey.primary_color,
    logoUrl: survey.logo_url,
    status: survey.status,
    createdAt: survey.created_at,
    updatedAt: survey.updated_at,
    questions: questions.results.map((question) => ({
      id: question.id,
      type: question.type,
      title: question.title,
      description: question.description,
      required: Boolean(question.required),
      config: parseJson<QuestionInput['config']>(question.config),
    })),
  }
}

const demoSurveys: DemoSurvey[] = [
  {
    title: 'Candidate experience pulse',
    description: 'A thoughtful check-in after every interview, built to improve the next one.',
    primaryColor: '#E85D3F',
    logoUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%23fff'/%3E%3Cpath d='M17 17h11v30H17zM35 17h12v11H35zM35 35h12v12H35z' fill='%23E85D3F'/%3E%3C/svg%3E",
    status: 'published',
    questions: [
      {
        type: 'short_text',
        title: 'What should we call you?',
        description: 'First name is perfect.',
        required: true,
        config: {},
      },
      {
        type: 'single_select',
        title: 'How clear was the interview process?',
        description: 'Choose the closest answer.',
        required: true,
        config: { options: ['Crystal clear', 'Mostly clear', 'A little confusing'] },
      },
      {
        type: 'multi_select',
        title: 'Which moments felt especially strong?',
        description: 'Choose as many as apply.',
        required: false,
        config: {
          options: ['Recruiter communication', 'Technical conversation', 'Team chemistry', 'Speed'],
        },
      },
      {
        type: 'rating',
        title: 'How likely are you to recommend applying?',
        description: '',
        required: true,
        config: { max: 5 },
      },
      {
        type: 'long_text',
        title: 'What is one thing we should improve?',
        description: 'Honest feedback helps us make the process more human.',
        required: false,
        config: {},
      },
      {
        type: 'date',
        title: 'When did your final conversation happen?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [
        'Maya',
        'Crystal clear',
        ['Recruiter communication', 'Team chemistry'],
        5,
        'The timeline and expectations were unusually clear.',
        '2026-06-05',
      ],
      [
        'Noah',
        'Mostly clear',
        ['Technical conversation', 'Team chemistry'],
        4,
        'A little more context before the technical round would help.',
        '2026-06-06',
      ],
      [
        'Isha',
        'Crystal clear',
        ['Recruiter communication', 'Speed'],
        5,
        'Keep the warm follow-ups. They made a real difference.',
        '2026-06-08',
      ],
      [
        'Ethan',
        'A little confusing',
        ['Technical conversation'],
        3,
        'The interview order changed twice at short notice.',
        '2026-06-09',
      ],
      [
        'Aarav',
        'Mostly clear',
        ['Team chemistry', 'Speed'],
        4,
        'Share the decision timeline at the end of the final call.',
        '2026-06-10',
      ],
    ],
  },
  {
    title: 'Product discovery interview',
    description:
      'Understand the job customers are trying to get done before designing the feature.',
    primaryColor: '#6C5CE7',
    status: 'published',
    questions: [
      {
        type: 'short_text',
        title: 'What team are you on?',
        description: '',
        required: true,
        config: {},
      },
      {
        type: 'single_select',
        title: 'How often do you run customer research?',
        description: '',
        required: true,
        config: { options: ['Every week', 'Every month', 'A few times a year', 'Never'] },
      },
      {
        type: 'multi_select',
        title: 'Where does research break down today?',
        description: '',
        required: true,
        config: {
          options: ['Recruiting', 'Scheduling', 'Synthesis', 'Sharing insights', 'Follow-through'],
        },
      },
      {
        type: 'long_text',
        title: 'Tell us about the last insight that changed your roadmap.',
        description: '',
        required: false,
        config: {},
      },
      {
        type: 'rating',
        title: 'How confident are you in your current research process?',
        description: '',
        required: true,
        config: { max: 5 },
      },
    ],
    responses: [
      [
        'Product',
        'Every week',
        ['Synthesis', 'Sharing insights'],
        'Users wanted speed, not more controls.',
        4,
      ],
      [
        'Design',
        'Every month',
        ['Recruiting', 'Scheduling'],
        'A diary study changed our onboarding.',
        3,
      ],
      ['Growth', 'A few times a year', ['Follow-through', 'Sharing insights'], '', 2],
      ['Engineering', 'Every month', ['Synthesis'], 'Support calls exposed a reliability gap.', 4],
    ],
  },
  {
    title: 'Design partner onboarding',
    description: 'A crisp intake for teams joining the early-access design partner program.',
    primaryColor: '#167D6D',
    status: 'published',
    questions: [
      {
        type: 'short_text',
        title: 'Company and team name',
        description: '',
        required: true,
        config: {},
      },
      {
        type: 'single_select',
        title: 'What stage is your company?',
        description: '',
        required: true,
        config: { options: ['Pre-seed', 'Seed', 'Series A', 'Series B+', 'Enterprise'] },
      },
      {
        type: 'multi_select',
        title: 'What would you like to explore?',
        description: '',
        required: true,
        config: {
          options: ['Workflow automation', 'AI governance', 'Analytics', 'Team collaboration'],
        },
      },
      {
        type: 'date',
        title: 'When would you like to kick off?',
        description: '',
        required: true,
        config: {},
      },
      {
        type: 'long_text',
        title: 'What would make this partnership a success?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [
        'Northstar / Ops',
        'Series A',
        ['Workflow automation', 'Analytics'],
        '2026-06-20',
        'A measurable reduction in review time.',
      ],
      [
        'Atlas / Trust',
        'Enterprise',
        ['AI governance', 'Team collaboration'],
        '2026-07-01',
        'A clear audit trail our legal team trusts.',
      ],
      [
        'Cedar / Product',
        'Seed',
        ['Workflow automation'],
        '2026-06-25',
        'A prototype we can test with five customers.',
      ],
    ],
  },
  {
    title: 'Remote team health check',
    description:
      'A lightweight monthly pulse for distributed teams that values honesty over vanity.',
    primaryColor: '#2358C7',
    status: 'published',
    questions: [
      {
        type: 'rating',
        title: 'How sustainable did your workload feel this month?',
        description: '',
        required: true,
        config: { max: 5 },
      },
      {
        type: 'single_select',
        title: 'How connected do you feel to the team?',
        description: '',
        required: true,
        config: {
          options: ['Very connected', 'Mostly connected', 'A little isolated', 'Disconnected'],
        },
      },
      {
        type: 'multi_select',
        title: 'What helped you do your best work?',
        description: '',
        required: false,
        config: {
          options: [
            'Clear priorities',
            'Focus time',
            'Manager support',
            'Team rituals',
            'Good tooling',
          ],
        },
      },
      {
        type: 'long_text',
        title: 'What should we change next month?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [4, 'Very connected', ['Clear priorities', 'Focus time'], 'Keep Wednesday meeting-free.'],
      [3, 'Mostly connected', ['Manager support', 'Team rituals'], 'Reduce status meetings.'],
      [5, 'Very connected', ['Focus time', 'Good tooling'], 'The new async brief is working well.'],
      [
        2,
        'A little isolated',
        ['Manager support'],
        'Pair new hires with a buddy across time zones.',
      ],
      [
        4,
        'Mostly connected',
        ['Clear priorities', 'Good tooling'],
        'More context in roadmap updates.',
      ],
      [3, 'Mostly connected', ['Team rituals'], 'Rotate meeting times more fairly.'],
    ],
  },
  {
    title: 'Customer love and loyalty',
    description: 'Measure loyalty, then capture the story behind the score.',
    primaryColor: '#C63C75',
    status: 'published',
    questions: [
      {
        type: 'rating',
        title: 'How likely are you to recommend Luma?',
        description: '1 means not likely, 10 means extremely likely.',
        required: true,
        config: { max: 10 },
      },
      {
        type: 'single_select',
        title: 'What best describes your relationship with us?',
        description: '',
        required: true,
        config: {
          options: ['New customer', 'Growing customer', 'Long-time customer', 'Former customer'],
        },
      },
      {
        type: 'long_text',
        title: 'What is the main reason for your score?',
        description: '',
        required: true,
        config: {},
      },
    ],
    responses: [
      [9, 'Long-time customer', 'It is the rare survey tool our customers compliment.'],
      [8, 'Growing customer', 'Fast to launch and easy for the whole team to understand.'],
      [10, 'New customer', 'The branded response experience won us over.'],
      [7, 'Growing customer', 'Would love conditional questions next.'],
      [9, 'Long-time customer', 'Reliable, calm, and does not get in the way.'],
    ],
  },
  {
    title: 'Website feedback',
    description: 'Catch usability friction while the browsing experience is still fresh.',
    primaryColor: '#D97706',
    status: 'published',
    questions: [
      {
        type: 'single_select',
        title: 'What brought you here today?',
        description: '',
        required: true,
        config: {
          options: ['Evaluate the product', 'Read documentation', 'See pricing', 'Get support'],
        },
      },
      {
        type: 'rating',
        title: 'How easy was it to find what you needed?',
        description: '',
        required: true,
        config: { max: 5 },
      },
      {
        type: 'multi_select',
        title: 'Which pages did you visit?',
        description: '',
        required: false,
        config: { options: ['Home', 'Product', 'Pricing', 'Docs', 'Blog'] },
      },
      {
        type: 'long_text',
        title: 'What felt unclear or missing?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [
        'Evaluate the product',
        4,
        ['Home', 'Product', 'Pricing'],
        'A short security overview would help.',
      ],
      ['Read documentation', 5, ['Docs', 'Blog'], 'Examples were clear and easy to adapt.'],
      ['See pricing', 3, ['Home', 'Pricing'], 'Explain what counts as a response.'],
      ['Get support', 4, ['Docs'], 'Search found the right article quickly.'],
    ],
  },
  {
    title: 'Community event RSVP',
    description: 'A warm registration flow for the next local product community evening.',
    primaryColor: '#8B5CF6',
    status: 'published',
    questions: [
      {
        type: 'short_text',
        title: 'Your name',
        description: '',
        required: true,
        config: {},
      },
      {
        type: 'date',
        title: 'Which event date can you attend?',
        description: '',
        required: true,
        config: {},
      },
      {
        type: 'single_select',
        title: 'What kind of ticket do you need?',
        description: '',
        required: true,
        config: { options: ['General', 'Student', 'Speaker', 'Volunteer'] },
      },
      {
        type: 'multi_select',
        title: 'What are you most excited about?',
        description: '',
        required: false,
        config: {
          options: ['Lightning talks', 'Hands-on demos', 'Meeting peers', 'Hiring corner'],
        },
      },
    ],
    responses: [
      ['Rhea', '2026-07-12', 'General', ['Lightning talks', 'Meeting peers']],
      ['Sam', '2026-07-12', 'Volunteer', ['Hands-on demos', 'Meeting peers']],
      ['Mina', '2026-07-19', 'Student', ['Lightning talks', 'Hiring corner']],
    ],
  },
  {
    title: 'Brand perception study',
    description: 'Learn the words, feelings, and alternatives customers associate with the brand.',
    primaryColor: '#0F766E',
    status: 'published',
    questions: [
      {
        type: 'multi_select',
        title: 'Which words best describe Luma?',
        description: 'Choose up to three.',
        required: true,
        config: { options: ['Calm', 'Premium', 'Friendly', 'Fast', 'Trustworthy', 'Creative'] },
      },
      {
        type: 'single_select',
        title: 'Which alternative would you consider first?',
        description: '',
        required: true,
        config: { options: ['Typeform', 'Tally', 'Google Forms', 'Build it ourselves'] },
      },
      {
        type: 'rating',
        title: 'How distinctive does our brand feel?',
        description: '',
        required: true,
        config: { max: 5 },
      },
      {
        type: 'long_text',
        title: 'What would make the brand more memorable?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [
        ['Calm', 'Premium', 'Trustworthy'],
        'Typeform',
        4,
        'Own the editorial visual style more boldly.',
      ],
      [
        ['Friendly', 'Fast', 'Creative'],
        'Tally',
        5,
        'The respondent experience is already memorable.',
      ],
      [['Calm', 'Friendly'], 'Google Forms', 4, 'More examples from real teams.'],
      [
        ['Premium', 'Trustworthy'],
        'Build it ourselves',
        3,
        'A stronger point of view on analytics.',
      ],
    ],
  },
  {
    title: 'Feature priority vote',
    description: 'Turn roadmap opinions into an explicit, defensible signal.',
    primaryColor: '#1F1F1D',
    status: 'published',
    questions: [
      {
        type: 'multi_select',
        title: 'Which improvements would create the most value?',
        description: 'Choose your top three.',
        required: true,
        config: {
          options: ['Conditional logic', 'Custom domains', 'Logo upload', 'Team roles', 'Webhooks'],
        },
      },
      {
        type: 'single_select',
        title: 'Which one should ship first?',
        description: '',
        required: true,
        config: {
          options: ['Conditional logic', 'Custom domains', 'Logo upload', 'Team roles', 'Webhooks'],
        },
      },
      {
        type: 'rating',
        title: 'How complete does the current product feel?',
        description: '',
        required: true,
        config: { max: 5 },
      },
      {
        type: 'long_text',
        title: 'What workflow are we still missing?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [
      [
        ['Conditional logic', 'Custom domains', 'Webhooks'],
        'Conditional logic',
        4,
        'Send qualified leads into our CRM.',
      ],
      [
        ['Logo upload', 'Team roles', 'Custom domains'],
        'Team roles',
        3,
        'Approval before publishing.',
      ],
      [
        ['Conditional logic', 'Logo upload', 'Webhooks'],
        'Webhooks',
        4,
        'Trigger a Slack workflow on response.',
      ],
      [
        ['Conditional logic', 'Custom domains'],
        'Custom domains',
        4,
        'Host forms on our product domain.',
      ],
      [['Team roles', 'Webhooks'], 'Team roles', 3, 'Separate editors from viewers.'],
    ],
  },
  {
    title: 'Beta waitlist intake',
    description: 'A draft showing the next campaign before it goes live.',
    primaryColor: '#64748B',
    status: 'draft',
    questions: [
      {
        type: 'short_text',
        title: 'Your work email',
        description: 'We will only use this for beta access.',
        required: true,
        config: {},
      },
      {
        type: 'single_select',
        title: 'How large is your team?',
        description: '',
        required: true,
        config: { options: ['Just me', '2–10', '11–50', '51–200', '201+'] },
      },
      {
        type: 'multi_select',
        title: 'What do you want to test?',
        description: '',
        required: false,
        config: { options: ['Builder', 'Branding', 'Analytics', 'Integrations'] },
      },
      {
        type: 'date',
        title: 'When could you start testing?',
        description: '',
        required: false,
        config: {},
      },
    ],
    responses: [],
  },
]

const seedDemoData = async (db: D1Database, ownerId: string) => {
  const seedPrefix = 'luma-demo-v2-'
  const existing = await db
    .prepare('SELECT COUNT(*) AS count FROM surveys WHERE owner_id = ? AND slug LIKE ?')
    .bind(ownerId, `${seedPrefix}%`)
    .first<{ count: number }>()

  if (Number(existing?.count) === demoSurveys.length) return

  await db
    .prepare(`DELETE FROM surveys WHERE owner_id = ? AND slug LIKE 'luma-demo-%'`)
    .bind(ownerId)
    .run()

  const statements: D1PreparedStatement[] = []
  const ownerKey = ownerId.replaceAll('-', '').slice(0, 10)

  for (const [surveyIndex, demo] of demoSurveys.entries()) {
    const surveyId = crypto.randomUUID()
    const slugBase = demo.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    const slug = `${seedPrefix}${slugBase}-${ownerKey}`
    const questionIds = demo.questions.map(() => crypto.randomUUID())

    statements.push(
      db
        .prepare(
          `INSERT INTO surveys
         (id, owner_id, title, description, slug, primary_color, logo_url, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`,
        )
        .bind(
          surveyId,
          ownerId,
          demo.title,
          demo.description,
          slug,
          demo.primaryColor,
          demo.logoUrl ?? '',
          demo.status,
          `-${surveyIndex + 1} days`,
          `-${surveyIndex} days`,
        ),
    )

    demo.questions.forEach((question, position) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO questions
           (id, survey_id, position, type, title, description, required, config)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            questionIds[position],
            surveyId,
            position,
            question.type,
            question.title,
            question.description,
            question.required ? 1 : 0,
            JSON.stringify(question.config),
          ),
      )
    })

    demo.responses.forEach((answers, responseIndex) => {
      const responseId = crypto.randomUUID()
      statements.push(
        db
          .prepare(
            `INSERT INTO responses (id, survey_id, created_at)
           VALUES (?, ?, datetime('now', ?))`,
          )
          .bind(responseId, surveyId, `-${responseIndex + surveyIndex} days`),
      )

      answers.forEach((answer, questionIndex) => {
        const questionId = questionIds[questionIndex]
        if (!questionId || answer === '' || answer === undefined) return
        statements.push(
          db
            .prepare(
              'INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)',
            )
            .bind(crypto.randomUUID(), responseId, questionId, JSON.stringify(answer)),
        )
      })
    })
  }

  for (let index = 0; index < statements.length; index += 50) {
    await db.batch(statements.slice(index, index + 50))
  }
}

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.post('/api/auth/sign-in', async (c) => {
  const body = await c.req.json<{ email?: string }>().catch(() => null)
  const email = body?.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = jsonError('Enter a valid work email.')
    return c.json({ error: error.message }, error.status)
  }

  let user = await c.env.DB.prepare('SELECT id, email FROM users WHERE email = ?')
    .bind(email)
    .first<AuthUser>()

  if (!user) {
    user = { id: crypto.randomUUID(), email }
    await c.env.DB.prepare('INSERT INTO users (id, email) VALUES (?, ?)')
      .bind(user.id, user.email)
      .run()
  }

  const token = `${crypto.randomUUID()}${crypto.randomUUID().replaceAll('-', '')}`
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString()
  await c.env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, user.id, expiresAt)
    .run()

  await seedDemoData(c.env.DB, user.id)

  return c.json({ token, user })
})

app.use('/api/me', auth)
app.get('/api/me', (c) => c.json({ user: c.get('user') }))

app.use('/api/auth/sign-out', auth)
app.post('/api/auth/sign-out', async (c) => {
  const token = getToken(c.req.header('Authorization'))
  if (token) await c.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
  return c.json({ ok: true })
})

app.use('/api/surveys/*', auth)

app.get('/api/surveys', async (c) => {
  const owner = c.get('user')
  await seedDemoData(c.env.DB, owner.id)
  const surveys = await c.env.DB.prepare(
    `SELECT surveys.id, surveys.title, surveys.description, surveys.slug,
            surveys.primary_color, surveys.logo_url, surveys.status,
            surveys.created_at, surveys.updated_at,
            COUNT(responses.id) AS response_count
     FROM surveys
     LEFT JOIN responses ON responses.survey_id = surveys.id
     WHERE surveys.owner_id = ?
     GROUP BY surveys.id
     ORDER BY surveys.updated_at DESC`,
  )
    .bind(owner.id)
    .all<{
      id: string
      title: string
      description: string
      slug: string
      primary_color: string
      logo_url: string
      status: 'draft' | 'published'
      created_at: string
      updated_at: string
      response_count: number
    }>()

  return c.json({
    surveys: surveys.results.map((survey) => ({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      slug: survey.slug,
      primaryColor: survey.primary_color,
      logoUrl: survey.logo_url,
      status: survey.status,
      responseCount: Number(survey.response_count),
      createdAt: survey.created_at,
      updatedAt: survey.updated_at,
    })),
  })
})

app.post('/api/surveys', async (c) => {
  const owner = c.get('user')
  const body = await c.req.json<{ title?: string }>().catch(() => null)
  const title = body?.title?.trim().slice(0, 120) || 'Untitled survey'
  const id = crypto.randomUUID()
  const questionId = crypto.randomUUID()

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO surveys (id, owner_id, title, slug)
       VALUES (?, ?, ?, ?)`,
    ).bind(id, owner.id, title, slugify(title)),
    c.env.DB.prepare(
      `INSERT INTO questions (id, survey_id, position, type, title, description, required, config)
       VALUES (?, ?, 0, 'short_text', 'What should we call you?', '', 1, '{}')`,
    ).bind(questionId, id),
  ])

  const survey = await getOwnedSurvey(c.env.DB, id, owner.id)
  return c.json({ survey }, 201)
})

app.get('/api/surveys/:id', async (c) => {
  const survey = await getOwnedSurvey(c.env.DB, c.req.param('id'), c.get('user').id)
  if (!survey) {
    const error = jsonError('Survey not found.', 404)
    return c.json({ error: error.message }, error.status)
  }
  return c.json({ survey })
})

app.put('/api/surveys/:id', async (c) => {
  const surveyId = c.req.param('id')
  const owner = c.get('user')
  const existing = await getOwnedSurvey(c.env.DB, surveyId, owner.id)
  if (!existing) {
    const error = jsonError('Survey not found.', 404)
    return c.json({ error: error.message }, error.status)
  }

  const input = validateSurvey(await c.req.json().catch(() => null))
  if (!input?.title || input.questions.length === 0) {
    const error = jsonError('A survey needs a title and at least one valid question.')
    return c.json({ error: error.message }, error.status)
  }
  if (input.questions.some((question) => !question.title.trim())) {
    const error = jsonError('Every question needs a title.')
    return c.json({ error: error.message }, error.status)
  }

  const statements = [
    c.env.DB.prepare(
      `UPDATE surveys
       SET title = ?, description = ?, primary_color = ?, logo_url = ?,
           status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND owner_id = ?`,
    ).bind(
      input.title,
      input.description,
      input.primaryColor,
      input.logoUrl,
      input.status,
      surveyId,
      owner.id,
    ),
    c.env.DB.prepare('DELETE FROM questions WHERE survey_id = ?').bind(surveyId),
    ...input.questions.map((question, position) =>
      c.env.DB.prepare(
        `INSERT INTO questions
           (id, survey_id, position, type, title, description, required, config)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        question.id,
        surveyId,
        position,
        question.type,
        question.title.trim().slice(0, 240),
        question.description.trim().slice(0, 500),
        question.required ? 1 : 0,
        JSON.stringify(question.config),
      ),
    ),
  ]
  await c.env.DB.batch(statements)

  const survey = await getOwnedSurvey(c.env.DB, surveyId, owner.id)
  return c.json({ survey })
})

app.delete('/api/surveys/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM surveys WHERE id = ? AND owner_id = ?')
    .bind(c.req.param('id'), c.get('user').id)
    .run()
  if (!result.meta.changes) {
    const error = jsonError('Survey not found.', 404)
    return c.json({ error: error.message }, error.status)
  }
  return c.json({ ok: true })
})

app.get('/api/surveys/:id/responses', async (c) => {
  const survey = await getOwnedSurvey(c.env.DB, c.req.param('id'), c.get('user').id)
  if (!survey) {
    const error = jsonError('Survey not found.', 404)
    return c.json({ error: error.message }, error.status)
  }

  const rows = await c.env.DB.prepare(
    `SELECT responses.id, responses.created_at, answers.question_id, answers.value
     FROM responses
     LEFT JOIN answers ON answers.response_id = responses.id
     WHERE responses.survey_id = ?
     ORDER BY responses.created_at DESC`,
  )
    .bind(survey.id)
    .all<{
      id: string
      created_at: string
      question_id: string | null
      value: string | null
    }>()

  const responseMap = new Map<
    string,
    { id: string; createdAt: string; answers: Record<string, unknown> }
  >()
  for (const row of rows.results) {
    const response = responseMap.get(row.id) ?? {
      id: row.id,
      createdAt: row.created_at,
      answers: {},
    }
    if (row.question_id && row.value) {
      response.answers[row.question_id] = parseJson<unknown>(row.value)
    }
    responseMap.set(row.id, response)
  }

  return c.json({ survey, responses: [...responseMap.values()] })
})

app.get('/api/surveys/:id/export', async (c) => {
  const survey = await getOwnedSurvey(c.env.DB, c.req.param('id'), c.get('user').id)
  if (!survey) return c.text('Survey not found.', 404)

  const rows = await c.env.DB.prepare(
    `SELECT responses.id, responses.created_at, answers.question_id, answers.value
     FROM responses
     LEFT JOIN answers ON answers.response_id = responses.id
     WHERE responses.survey_id = ?
     ORDER BY responses.created_at DESC`,
  )
    .bind(survey.id)
    .all<{
      id: string
      created_at: string
      question_id: string | null
      value: string | null
    }>()

  const escapeCsv = (value: unknown) => {
    const text = Array.isArray(value) ? value.join('; ') : String(value ?? '')
    return `"${text.replaceAll('"', '""')}"`
  }
  const grouped = new Map<string, { createdAt: string; answers: Record<string, unknown> }>()
  for (const row of rows.results) {
    const response = grouped.get(row.id) ?? { createdAt: row.created_at, answers: {} }
    if (row.question_id && row.value) {
      response.answers[row.question_id] = parseJson<unknown>(row.value)
    }
    grouped.set(row.id, response)
  }

  const header = ['Submitted at', ...survey.questions.map((question) => question.title)]
  const lines = [
    header.map(escapeCsv).join(','),
    ...[...grouped.values()].map((response) =>
      [response.createdAt, ...survey.questions.map((question) => response.answers[question.id])]
        .map(escapeCsv)
        .join(','),
    ),
  ]

  return c.body(lines.join('\n'), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${survey.slug}-responses.csv"`,
  })
})

app.get('/api/public/surveys/:slug', async (c) => {
  const survey = await c.env.DB.prepare(
    `SELECT id FROM surveys WHERE slug = ? AND status = 'published'`,
  )
    .bind(c.req.param('slug'))
    .first<{ id: string }>()
  if (!survey) {
    const error = jsonError('This survey is not available.', 404)
    return c.json({ error: error.message }, error.status)
  }

  const fullSurvey = await c.env.DB.prepare(
    `SELECT id, title, description, slug, primary_color, logo_url
     FROM surveys WHERE id = ?`,
  )
    .bind(survey.id)
    .first<{
      id: string
      title: string
      description: string
      slug: string
      primary_color: string
      logo_url: string
    }>()
  const questions = await c.env.DB.prepare(
    `SELECT id, type, title, description, required, config
     FROM questions WHERE survey_id = ? ORDER BY position ASC`,
  )
    .bind(survey.id)
    .all<{
      id: string
      type: QuestionType
      title: string
      description: string
      required: number
      config: string
    }>()

  return c.json({
    survey: {
      id: fullSurvey?.id,
      title: fullSurvey?.title,
      description: fullSurvey?.description,
      slug: fullSurvey?.slug,
      primaryColor: fullSurvey?.primary_color,
      logoUrl: fullSurvey?.logo_url,
      questions: questions.results.map((question) => ({
        id: question.id,
        type: question.type,
        title: question.title,
        description: question.description,
        required: Boolean(question.required),
        config: parseJson<QuestionInput['config']>(question.config),
      })),
    },
  })
})

app.post('/api/public/surveys/:slug/responses', async (c) => {
  const survey = await c.env.DB.prepare(
    `SELECT id FROM surveys WHERE slug = ? AND status = 'published'`,
  )
    .bind(c.req.param('slug'))
    .first<{ id: string }>()
  if (!survey) {
    const error = jsonError('This survey is not available.', 404)
    return c.json({ error: error.message }, error.status)
  }

  const body = await c.req.json<{ answers?: Record<string, unknown> }>().catch(() => null)
  const answers = body?.answers
  if (!answers || typeof answers !== 'object') {
    const error = jsonError('Submit an answer set.')
    return c.json({ error: error.message }, error.status)
  }

  const questions = await c.env.DB.prepare('SELECT id, required FROM questions WHERE survey_id = ?')
    .bind(survey.id)
    .all<{ id: string; required: number }>()

  for (const question of questions.results) {
    const answer = answers[question.id]
    const empty =
      answer === undefined ||
      answer === null ||
      answer === '' ||
      (Array.isArray(answer) && answer.length === 0)
    if (question.required && empty) {
      const error = jsonError('Please answer every required question.')
      return c.json({ error: error.message }, error.status)
    }
  }

  const responseId = crypto.randomUUID()
  const statements = [
    c.env.DB.prepare('INSERT INTO responses (id, survey_id) VALUES (?, ?)').bind(
      responseId,
      survey.id,
    ),
    ...questions.results
      .filter((question) => answers[question.id] !== undefined)
      .map((question) =>
        c.env.DB.prepare(
          'INSERT INTO answers (id, response_id, question_id, value) VALUES (?, ?, ?, ?)',
        ).bind(crypto.randomUUID(), responseId, question.id, JSON.stringify(answers[question.id])),
      ),
  ]
  await c.env.DB.batch(statements)

  return c.json({ responseId }, 201)
})

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Something went wrong. Please try again.' }, 500)
})

export default app
