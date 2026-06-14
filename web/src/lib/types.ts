export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'rating'
  | 'date'

export type Question = {
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

export type Survey = {
  id: string
  title: string
  description: string
  slug: string
  primaryColor: string
  logoUrl: string
  status: 'draft' | 'published'
  createdAt?: string
  updatedAt?: string
  responseCount?: number
  questions: Question[]
}

export type SurveySummary = Omit<Survey, 'questions'> & {
  responseCount: number
}

export type ResponseRecord = {
  id: string
  createdAt: string
  answers: Record<string, unknown>
}

export type User = {
  id: string
  email: string
}
