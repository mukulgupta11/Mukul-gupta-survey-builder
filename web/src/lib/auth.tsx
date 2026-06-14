import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, getMe, session, signOut as signOutRequest } from './api'
import type { User } from './types'

type AuthContextValue = {
  user: User | null
  loading: boolean
  setSignedIn: (token: string, user: User) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session.get()) {
      setLoading(false)
      return
    }
    getMe()
      .then((response) => setUser(response.user))
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) session.clear()
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setSignedIn: (token, nextUser) => {
        session.set(token)
        setUser(nextUser)
      },
      signOut: async () => {
        try {
          await signOutRequest()
        } finally {
          session.clear()
          setUser(null)
        }
      },
    }),
    [loading, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
