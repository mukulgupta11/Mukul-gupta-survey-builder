import type { ResponseRecord, Survey, SurveySummary, User } from './types'

const TOKEN_KEY = 'luma-session'
const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const apiUrl = (path: string) => `${API_ORIGIN}${path}`

export const session = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

type ApiOptions = RequestInit & {
  auth?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (options.auth !== false) {
    const token = session.get()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(apiUrl(path), { ...options, headers })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(payload?.error || 'Something went wrong.', response.status)
  }
  return response.json() as Promise<T>
}

export const signIn = (email: string) =>
  api<{ token: string; user: User }>('/api/auth/sign-in', {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ email }),
  })

export const getMe = () => api<{ user: User }>('/api/me')

export const signOut = () => api<{ ok: true }>('/api/auth/sign-out', { method: 'POST' })

export const getSurveys = () => api<{ surveys: SurveySummary[] }>('/api/surveys')

export const createSurvey = (title = 'Untitled survey') =>
  api<{ survey: Survey }>('/api/surveys', {
    method: 'POST',
    body: JSON.stringify({ title }),
  })

export const getSurvey = (id: string) => api<{ survey: Survey }>(`/api/surveys/${id}`)

export const updateSurvey = (survey: Survey) =>
  api<{ survey: Survey }>(`/api/surveys/${survey.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: survey.title,
      description: survey.description,
      primaryColor: survey.primaryColor,
      logoUrl: survey.logoUrl,
      status: survey.status,
      questions: survey.questions,
    }),
  })

export const deleteSurvey = (id: string) =>
  api<{ ok: true }>(`/api/surveys/${id}`, { method: 'DELETE' })

export const getResponses = (id: string) =>
  api<{ survey: Survey; responses: ResponseRecord[] }>(`/api/surveys/${id}/responses`)

export const getPublicSurvey = (slug: string) =>
  api<{ survey: Survey }>(`/api/public/surveys/${slug}`, { auth: false })

export const submitResponse = (slug: string, answers: Record<string, unknown>) =>
  api<{ responseId: string }>(`/api/public/surveys/${slug}/responses`, {
    method: 'POST',
    auth: false,
    body: JSON.stringify({ answers }),
  })
