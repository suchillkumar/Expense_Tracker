import {
  AppNotification,
  Budget,
  Transaction,
  User,
  MonthlyReport,
  YearlyReport,
  SpendingAnalysisResult,
  ExpensePredictionResult,
  SavingRecommendationResult,
  BudgetRecommendation,
  AIInsight
} from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function snakeToCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const camel = k === '_id' ? 'id' : k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    out[camel] = v
  }
  return out
}

function camelToSnake(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(camelToSnake)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
      out[snake] = camelToSnake(v)
    }
    return out
  }
  return obj
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  const c = snakeToCamel(row)
  return {
    id: c.id as string,
    description: c.description as string,
    amount: (c.amount as number) || 0,
    type: c.type as Transaction['type'],
    category: (c.category as string) || 'Other',
    date: (c.date as string) || new Date().toISOString(),
    paymentMethod: (c.paymentMethod as string) || (c.payment_method as string) || 'Cash',
    notes: (c.notes as string) || undefined,
    currency: (c.currency as string) || 'INR',
    exchangeRate: (c.exchangeRate as number) || 1,
    createdAt: (c.createdAt as string) || undefined,
    updatedAt: (c.updatedAt as string) || undefined,
  }
}

function mapBudget(row: Record<string, unknown>): Budget {
  const c = snakeToCamel(row)
  return {
    id: c.id as string,
    name: (c.name as string) || undefined,
    category: c.category as string,
    limitAmount: (c.limitAmount as number) || (c.limit_amount as number) || 0,
    spentAmount: (c.spentAmount as number) || (c.spent_amount as number) || 0,
    month: c.month as string,
    period: (c.period as Budget['period']) || 'monthly',
    startDate: (c.startDate as string) || undefined,
    endDate: (c.endDate as string) || undefined,
    alertThreshold: (c.alertThreshold as number) || 80,
    createdAt: (c.createdAt as string) || undefined,
  }
}

function mapNotification(row: Record<string, unknown>): AppNotification {
  const c = snakeToCamel(row)
  return {
    id: c.id as string,
    title: (c.title as string) || undefined,
    message: c.message as string,
    date: (c.createdAt as string) || (c.date as string) || new Date().toISOString(),
    read: Boolean(c.read || c.isRead),
    type: (c.type as AppNotification['type']) || 'info',
    category: (c.category as string) || undefined,
  }
}

const SESSION_KEY = 'spendwise_session'
const LOCAL_USERS_KEY = 'spendwise_local_users'
const LOCAL_TOKEN_PREFIX = 'local-'

const LS_PREFIX = 'spendwise_local_'
const LS_KEYS = {
  transactions: `${LS_PREFIX}transactions`,
  budgets: `${LS_PREFIX}budgets`,
  notifications: `${LS_PREFIX}notifications`,
} as const

export interface Session {
  token: string
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function saveSession(session: Session | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /failed to fetch|networkerror|network request failed/i.test(err.message)
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function lsSet<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

interface LocalUser {
  id: string
  name: string
  email: string
  password: string
}

function getLocalUsers(): LocalUser[] {
  return lsGet<LocalUser[]>(LOCAL_USERS_KEY, [])
}

function saveLocalUsers(users: LocalUser[]): void {
  lsSet(LOCAL_USERS_KEY, users)
}

function isLocalSession(): boolean {
  return getSession()?.token.startsWith(LOCAL_TOKEN_PREFIX) ?? false
}

interface RequestOptions {
  method?: string
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = getSession()
  const body = options.body === undefined ? undefined : camelToSnake(options.body)
  const res = await fetch(BASE + path, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (!res.ok) {
    if (res.status === 401 && !isLocalSession()) {
      saveSession(null)
    }
    let message = 'Request failed'
    try {
      const b = await res.json()
      if (b?.error || b?.message) message = b.error || b.message
    } catch {
      /* ignore body parse errors */
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  /* ================= AUTH ================= */
  async register(name: string, email: string, password: string, phone?: string, confirmPassword?: string): Promise<User> {
    try {
      const res = await request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
        method: 'POST',
        body: { name, email, password, phone, confirm_password: confirmPassword }
      })
      saveSession({ token: res.accessToken })
      return res.user
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }

    const users = getLocalUsers()
    if (users.some(u => u.email === email.toLowerCase())) {
      throw new Error('Email already registered')
    }
    const user: LocalUser = { id: crypto.randomUUID(), name, email: email.toLowerCase(), password }
    users.push(user)
    saveLocalUsers(users)
    saveSession({ token: LOCAL_TOKEN_PREFIX + user.id })
    return { id: user.id, name: user.name, email: user.email, phone, onboardingCompleted: true }
  },

  async login(email: string, password: string): Promise<User> {
    try {
      const res = await request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      saveSession({ token: res.accessToken })
      return res.user
    } catch (err) {
      if (!isNetworkError(err)) throw err
    }

    const users = getLocalUsers()
    const match = users.find(u => u.email === email.toLowerCase() && u.password === password)
    if (!match) throw new Error('Invalid email or password')
    saveSession({ token: LOCAL_TOKEN_PREFIX + match.id })
    return { id: match.id, name: match.name, email: match.email, onboardingCompleted: true }
  },

  logout(): void {
    if (!isLocalSession()) {
      request('/auth/logout', { method: 'POST' }).catch(() => {})
    }
    saveSession(null)
  },

  async getCurrentUser(): Promise<User | null> {
    const session = getSession()
    if (!session?.token) return null

    if (session.token.startsWith(LOCAL_TOKEN_PREFIX)) {
      const userId = session.token.slice(LOCAL_TOKEN_PREFIX.length)
      const users = getLocalUsers()
      const user = users.find(u => u.id === userId)
      if (!user) { saveSession(null); return null }
      return { id: user.id, name: user.name, email: user.email, onboardingCompleted: true }
    }

    try {
      return await request<User>('/auth/me')
    } catch {
      saveSession(null)
      return null
    }
  },

  async updateUser(updates: Partial<User>): Promise<User | null> {
    return request<User>('/auth/profile', { method: 'PATCH', body: updates })
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<void>('/auth/password', {
      method: 'PATCH',
      body: { currentPassword, newPassword }
    })
  },

  async forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    return request<{ message: string; token?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    })
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, new_password: newPassword },
    })
  },

  /* ================= TRANSACTIONS (Section 13-17) ================= */
  async getTransactions(params?: { category?: string; type?: string; search?: string; paymentMethod?: string; sort?: string; page?: number; limit?: number }): Promise<Transaction[]> {
    const query = new URLSearchParams()
    if (params?.category) query.set('category', params.category)
    if (params?.type) query.set('type', params.type)
    if (params?.search) query.set('search', params.search)
    if (params?.paymentMethod) query.set('payment_method', params.paymentMethod)
    if (params?.sort) query.set('sort', params.sort)
    if (params?.page) query.set('page', String(params.page))
    if (params?.limit) query.set('limit', String(params.limit))

    const qStr = query.toString() ? `?${query.toString()}` : ''
    try {
      const res = await request<{ data: Record<string, unknown>[]; total: number }>(`/transactions${qStr}`)
      const rows = Array.isArray(res) ? res : (res?.data ?? [])
      return rows.map(mapTransaction)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      return lsGet<Transaction[]>(LS_KEYS.transactions, [])
    }
  },

  async addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    try {
      const raw = await request<Record<string, unknown>>('/transactions', { method: 'POST', body: tx })
      return mapTransaction(raw)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const newTx: Transaction = { ...tx, id: crypto.randomUUID() } as Transaction
      const all = lsGet<Transaction[]>(LS_KEYS.transactions, [])
      all.push(newTx)
      lsSet(LS_KEYS.transactions, all)
      return newTx
    }
  },

  async updateTransaction(tx: Transaction): Promise<Transaction> {
    try {
      const raw = await request<Record<string, unknown>>(`/transactions/${tx.id}`, { method: 'PUT', body: tx })
      return mapTransaction(raw)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<Transaction[]>(LS_KEYS.transactions, [])
      const idx = all.findIndex(t => t.id === tx.id)
      if (idx >= 0) all[idx] = tx
      lsSet(LS_KEYS.transactions, all)
      return tx
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    try {
      await request<void>(`/transactions/${id}`, { method: 'DELETE' })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<Transaction[]>(LS_KEYS.transactions, [])
      lsSet(LS_KEYS.transactions, all.filter(t => t.id !== id))
    }
  },

  async importTransactions(rows: Omit<Transaction, 'id'>[]): Promise<{ count: number }> {
    try {
      return await request<{ count: number }>('/transactions/import', {
        method: 'POST',
        body: { rows }
      })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<Transaction[]>(LS_KEYS.transactions, [])
      const newTxs = rows.map(r => ({ ...r, id: crypto.randomUUID() } as Transaction))
      all.push(...newTxs)
      lsSet(LS_KEYS.transactions, all)
      return { count: newTxs.length }
    }
  },

  /* ================= BUDGETS (Section 19-21) ================= */
  async getBudgets(): Promise<Budget[]> {
    try {
      const raw = await request<Record<string, unknown>[]>('/budgets')
      return raw.map(mapBudget)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      return lsGet<Budget[]>(LS_KEYS.budgets, [])
    }
  },

  async saveBudget(budget: Budget): Promise<Budget> {
    try {
      return await request<Budget>('/budgets', { method: 'POST', body: budget })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<Budget[]>(LS_KEYS.budgets, [])
      const idx = all.findIndex(b => b.id === budget.id || (b.category === budget.category && b.month === budget.month))
      if (idx >= 0) all[idx] = budget
      else all.push(budget)
      lsSet(LS_KEYS.budgets, all)
      return budget
    }
  },

  async deleteBudget(id: string): Promise<void> {
    try {
      await request<void>(`/budgets/${id}`, { method: 'DELETE' })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<Budget[]>(LS_KEYS.budgets, [])
      lsSet(LS_KEYS.budgets, all.filter(b => b.id !== id))
    }
  },

  /* ================= AI SUITE (Section 18, 22-28) ================= */
  async suggestCategory(description: string): Promise<{ description: string; category: string }> {
    return request<{ description: string; category: string }>(`/ai/categorize?description=${encodeURIComponent(description)}`)
  },

  async aiChat(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<{ reply: string; quickStats?: { income?: number; expense?: number; balance?: number } }> {
    try {
      return await request<{ reply: string; quickStats?: { income?: number; expense?: number; balance?: number } }>('/ai/chat', {
        method: 'POST',
        body: { message, history },
      })
    } catch (err) {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY
      if (apiKey) {
        try {
          const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
          history.slice(-6).forEach(h => {
            contents.push({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: h.content }],
            })
          })
          contents.push({ role: 'user', parts: [{ text: message }] })

          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: 'You are Expense Tracker AI, a world-class personal finance assistant. Answer the user with helpful, precise, actionable guidance formatted with clean Markdown.' }]
              },
              contents,
              generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
            })
          })
          if (res.ok) {
            const data = await res.json()
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
            if (reply) return { reply: reply.trim() }
          }
        } catch {
          // fallback to throw error
        }
      }
      throw err
    }
  },

  async getSpendingAnalysis(): Promise<SpendingAnalysisResult> {
    return request<SpendingAnalysisResult>('/ai/analyze')
  },

  async getExpensePrediction(months: number = 3): Promise<ExpensePredictionResult> {
    return request<ExpensePredictionResult>(`/ai/predict?months=${months}`)
  },

  async getSavingRecommendations(): Promise<SavingRecommendationResult> {
    return request<SavingRecommendationResult>('/ai/recommend')
  },

  async generateAIBudget(input: { monthlyIncome: number; age?: number; existingExpenses?: number; savingsGoal?: number; financialGoal?: string }): Promise<BudgetRecommendation> {
    try {
      return await request<BudgetRecommendation>('/ai/budget', {
        method: 'POST',
        body: input,
      })
    } catch {
      // 50/30/20 algorithmic fallback
      const income = input.monthlyIncome || 60000
      const needs = Math.round(income * 0.50)
      const wants = Math.round(income * 0.30)
      const savings = Math.round(income * 0.20)
      const emergency = Math.round(income * 0.10)
      return {
        monthlyIncome: income,
        needs: {
          amount: needs,
          percentage: 50,
          description: 'Essential Living: Housing, groceries, utilities, transit, and healthcare.',
        },
        wants: {
          amount: wants,
          percentage: 30,
          description: 'Lifestyle & Discretionary: Dining out, entertainment, shopping, and subscriptions.',
        },
        savings: {
          amount: savings,
          percentage: 20,
          description: 'Wealth Accumulation: Emergency fund, investments, retirement, and milestone goals.',
        },
        emergencyFund: {
          amount: emergency,
          percentage: 10,
          description: 'Liquidity Buffer: 3-6 months of essential living expenses.',
        },
        categoryBudgets: [
          { category: 'Food', recommendedAmount: Math.round(needs * 0.40), percentageOfIncome: 20, rationale: 'Groceries and basic meal prep' },
          { category: 'Bills', recommendedAmount: Math.round(needs * 0.35), percentageOfIncome: 17.5, rationale: 'Electricity, water, WiFi, and phone bills' },
          { category: 'Transport', recommendedAmount: Math.round(needs * 0.15), percentageOfIncome: 7.5, rationale: 'Fuel, transit passes, and maintenance' },
          { category: 'Healthcare', recommendedAmount: Math.round(needs * 0.10), percentageOfIncome: 5, rationale: 'Pharmacy, health wellness, and medical' },
          { category: 'Shopping', recommendedAmount: Math.round(wants * 0.50), percentageOfIncome: 15, rationale: 'Apparel, accessories, and personal items' },
          { category: 'Entertainment', recommendedAmount: Math.round(wants * 0.35), percentageOfIncome: 10.5, rationale: 'Movies, outings, and streaming' },
          { category: 'Travel', recommendedAmount: Math.round(wants * 0.15), percentageOfIncome: 4.5, rationale: 'Weekend getaways and leisure commutes' },
        ],
      }
    }
  },

  async getAIInsights(): Promise<AIInsight[]> {
    try {
      return await request<AIInsight[]>('/ai/insights')
    } catch {
      return []
    }
  },

  /* ================= REPORTS (Section 31) ================= */
  async getMonthlyReport(month?: string): Promise<MonthlyReport> {
    const q = month ? `?month=${month}` : ''
    return request<MonthlyReport>(`/reports/monthly${q}`)
  },

  async getYearlyReport(year?: number): Promise<YearlyReport> {
    const q = year ? `?year=${year}` : ''
    return request<YearlyReport>(`/reports/yearly${q}`)
  },

  getCSVExportUrl(): string {
    return `${BASE}/export/csv`
  },

  /* ================= NOTIFICATIONS (Section 34) ================= */
  async getNotifications(): Promise<AppNotification[]> {
    try {
      const raw = await request<Record<string, unknown>[]>('/notifications')
      return raw.map(mapNotification)
    } catch (err) {
      if (!isNetworkError(err)) throw err
      return lsGet<AppNotification[]>(LS_KEYS.notifications, [])
    }
  },

  async addNotification(notification: Omit<AppNotification, 'id' | 'date' | 'read'>): Promise<void> {
    try {
      await request<void>('/notifications', { method: 'POST', body: notification })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<AppNotification[]>(LS_KEYS.notifications, [])
      all.push({ ...notification, id: crypto.randomUUID(), date: new Date().toISOString(), read: false })
      lsSet(LS_KEYS.notifications, all)
    }
  },

  async markNotificationsRead(): Promise<void> {
    try {
      await request<void>('/notifications/read', { method: 'PATCH' })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const all = lsGet<AppNotification[]>(LS_KEYS.notifications, [])
      lsSet(LS_KEYS.notifications, all.map(n => ({ ...n, read: true })))
    }
  },

  /* ================= DEMO DATA GENERATOR (Section 50) ================= */
  async loadDemoData(): Promise<void> {
    const today = new Date()
    const monthStr = today.toISOString().slice(0, 7)

    const demoTransactions: Omit<Transaction, 'id'>[] = [
      {
        description: 'Monthly Corporate Salary',
        amount: 85000,
        type: 'income',
        category: 'Salary',
        date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString(),
        paymentMethod: 'Bank Transfer',
        notes: 'Monthly direct deposit',
      },
      {
        description: 'Freelance Design Consultation',
        amount: 22000,
        type: 'income',
        category: 'Freelance',
        date: new Date(today.getFullYear(), today.getMonth(), 8).toISOString(),
        paymentMethod: 'UPI',
        notes: 'UI/UX project milestone',
      },
      {
        description: 'Apartment Monthly Rent',
        amount: 24000,
        type: 'expense',
        category: 'Rent',
        date: new Date(today.getFullYear(), today.getMonth(), 2).toISOString(),
        paymentMethod: 'Bank Transfer',
        notes: 'Flat 402 rent',
      },
      {
        description: 'Supermarket Groceries & Essentials',
        amount: 6200,
        type: 'expense',
        category: 'Food',
        date: new Date(today.getFullYear(), today.getMonth(), 5).toISOString(),
        paymentMethod: 'Card',
        notes: 'Weekly whole foods shopping',
      },
      {
        description: 'Swiggy Gourmet Dinner & Desserts',
        amount: 1450,
        type: 'expense',
        category: 'Food',
        date: new Date(today.getFullYear(), today.getMonth(), 10).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Weekend dinner delivery',
      },
      {
        description: 'High-Speed Fiber Internet & Electricity',
        amount: 2800,
        type: 'expense',
        category: 'Bills',
        date: new Date(today.getFullYear(), today.getMonth(), 6).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Utility bill payments',
      },
      {
        description: 'Uber Commute & Metro Passes',
        amount: 2350,
        type: 'expense',
        category: 'Transport',
        date: new Date(today.getFullYear(), today.getMonth(), 12).toISOString(),
        paymentMethod: 'UPI',
        notes: 'Weekly office travel',
      },
      {
        description: 'Netflix & Spotify Premium Subscription',
        amount: 899,
        type: 'expense',
        category: 'Entertainment',
        date: new Date(today.getFullYear(), today.getMonth(), 14).toISOString(),
        paymentMethod: 'Card',
        notes: 'Auto-debit entertainment packs',
      },
      {
        description: 'Zara Weekend Casual Apparel',
        amount: 4800,
        type: 'expense',
        category: 'Shopping',
        date: new Date(today.getFullYear(), today.getMonth(), 16).toISOString(),
        paymentMethod: 'Card',
        notes: 'Summer collection shirts',
      },
      {
        description: 'Pharmacy & Wellness Checkup',
        amount: 1250,
        type: 'expense',
        category: 'Healthcare',
        date: new Date(today.getFullYear(), today.getMonth(), 18).toISOString(),
        paymentMethod: 'Cash',
        notes: 'Vitamins and routine checkup',
      }
    ]

    const demoBudgets: Budget[] = [
      { id: crypto.randomUUID(), category: 'Food', limitAmount: 12000, spentAmount: 7650, month: monthStr, alertThreshold: 80 },
      { id: crypto.randomUUID(), category: 'Rent', limitAmount: 25000, spentAmount: 24000, month: monthStr, alertThreshold: 80 },
      { id: crypto.randomUUID(), category: 'Shopping', limitAmount: 8000, spentAmount: 4800, month: monthStr, alertThreshold: 80 },
      { id: crypto.randomUUID(), category: 'Bills', limitAmount: 5000, spentAmount: 2800, month: monthStr, alertThreshold: 80 },
      { id: crypto.randomUUID(), category: 'Transport', limitAmount: 4500, spentAmount: 2350, month: monthStr, alertThreshold: 80 },
      { id: crypto.randomUUID(), category: 'Entertainment', limitAmount: 3000, spentAmount: 899, month: monthStr, alertThreshold: 80 },
    ]

    await Promise.all([
      ...demoTransactions.map(tx => api.addTransaction(tx)),
      ...demoBudgets.map(b => api.saveBudget(b)),
      api.addNotification({
        title: 'Demo Data Loaded',
        message: 'Sample transactions and category budgets have been loaded for exploration.',
        type: 'info',
      })
    ])
  }
}
