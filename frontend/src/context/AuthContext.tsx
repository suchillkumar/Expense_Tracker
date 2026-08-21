import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { api, getSession } from '../services/api'
import { User } from '../types'

interface OnboardingData {
  age?: number
  occupation?: string
  monthly_income?: number
  preferred_currency?: string
  monthly_savings_goal?: number
  financial_goal?: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  restoring: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, phone?: string, confirmPassword?: string) => Promise<void>
  completeOnboarding: (data: OnboardingData) => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<User>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const restore = async () => {
      if (!getSession()?.token) {
        setRestoring(false)
        return
      }
      const current = await api.getCurrentUser()
      if (cancelled) return
      setUser(current)
      setRestoring(false)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const u = await api.login(email, password)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, phone?: string, confirmPassword?: string) => {
    setLoading(true)
    try {
      const u = await api.register(name, email, password, phone, confirmPassword)
      setUser(u)
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = async (data: OnboardingData) => {
    setLoading(true)
    try {
      const updated = await api.updateUser({
        age: data.age,
        occupation: data.occupation,
        monthlyIncome: data.monthly_income,
        preferredCurrency: data.preferred_currency,
        monthlySavingsGoal: data.monthly_savings_goal,
        financialGoal: data.financial_goal,
        onboardingCompleted: true,
      })
      if (updated) {
        setUser(updated)
      } else {
        setUser((prev) => (prev ? { ...prev, onboardingCompleted: true } : null))
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    api.logout()
    setUser(null)
  }

  const updateProfile = async (updates: Partial<User>) => {
    const updated = await api.updateUser(updates)
    if (updated) setUser(updated)
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await api.changePassword(currentPassword, newPassword)
  }

  const value = useMemo(
    () => ({ user, loading, restoring, login, register, completeOnboarding, logout, updateProfile, changePassword }),
    [user, loading, restoring]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
