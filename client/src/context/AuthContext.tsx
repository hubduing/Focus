import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiGetMe,
  apiLogin,
  apiLogout,
  apiRefresh,
  apiRegister,
  clearSession,
  getAccessToken,
  getRefreshToken,
  getUser,
  saveSession,
  type User,
} from '../lib/api'

interface AuthContextValue {
  user: User | null
  ready: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: { email: string; password: string; name: string; phone?: string }) => Promise<User>
  logout: () => Promise<void>
  setUser: (user: User) => void
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => getUser())
  const [ready, setReady] = useState(false)

  // Восстановление сессии: чтение профиля по сохранённому токену.
  useEffect(() => {
    let cancelled = false
    async function boot() {
      const token = getAccessToken()
      if (!token) {
        setReady(true)
        return
      }
      try {
        const cached = getUser()
        if (cached) setUserState(cached)
        const { data } = await apiGetMe()
        if (!cancelled) {
          setUserState(data)
          saveSession(data, token, getRefreshToken() ?? '')
        }
      } catch {
        const ok = await tryRefresh()
        if (!cancelled && !ok) {
          clearSession()
          setUserState(null)
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    }
    boot()
    return () => {
      cancelled = true
    }
  }, [])

  async function tryRefresh(): Promise<boolean> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false
    try {
      const { data } = await apiRefresh(refreshToken)
      saveSession(getUser() ?? (user as User), data.accessToken, data.refreshToken)
      return true
    } catch {
      return false
    }
  }

  const refresh = useCallback(async () => {
    const ok = await tryRefresh()
    if (!ok) {
      clearSession()
      setUserState(null)
    }
    return ok
  }, [])

  // Обновление токена без выхода. Возвращает новый access token или null.
  const login = useCallback(async (email: string, password: string) => {
    const { data } = await apiLogin(email, password)
    saveSession(data.user, data.accessToken, data.refreshToken)
    setUserState(data.user)
    return data.user
  }, [])

  const register = useCallback(async (input: { email: string; password: string; name: string; phone?: string }) => {
    const { data } = await apiRegister(input)
    saveSession(data.user, data.accessToken, data.refreshToken)
    setUserState(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      await apiLogout(refreshToken ?? undefined)
    } catch {
      // даже если сервер недоступен — локальную сессию завершаем
    }
    clearSession()
    setUserState(null)
  }, [])

  const setUser = useCallback((next: User) => {
    setUserState(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, register, logout, setUser, refresh }),
    [user, ready, login, register, logout, setUser, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth должен использоваться внутри AuthProvider')
  }
  return ctx
}