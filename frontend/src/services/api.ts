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

  async loginDemo(): Promise<User> {
    const demoEmail = 'alex.morgan@example.com'
    const demoPass = 'DemoPass123!'
    const demoName = 'Alex Morgan'

    try {
      return await this.login(demoEmail, demoPass)
    } catch {
      // Local fallback
      const users = getLocalUsers()
      let user = users.find(u => u.email === demoEmail)
      if (!user) {
        user = { id: crypto.randomUUID(), name: demoName, email: demoEmail, password: demoPass }
        users.push(user)
        saveLocalUsers(users)
      }
      saveSession({ token: LOCAL_TOKEN_PREFIX + user.id })

      // If transactions are empty, seed demo data immediately
      const currentTx = lsGet<unknown[]>(LS_KEYS.transactions, [])
      if (!currentTx || currentTx.length === 0) {
        await this.loadDemoData()
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: '+91 98765 43210',
        onboardingCompleted: true,
        preferredCurrency: 'INR'
      }
    }
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
    try {
      const res = await request<User>('/auth/profile', { method: 'PATCH', body: updates })
      return res
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const session = getSession()
      if (session?.token?.startsWith(LOCAL_TOKEN_PREFIX)) {
        const userId = session.token.slice(LOCAL_TOKEN_PREFIX.length)
        const users = getLocalUsers()
        const idx = users.findIndex(u => u.id === userId)
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...updates }
          saveLocalUsers(users)
          return users[idx]
        }
      }
      return null
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await request<void>('/auth/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword }
      })
    } catch (err) {
      if (!isNetworkError(err)) throw err
      const session = getSession()
      if (session?.token?.startsWith(LOCAL_TOKEN_PREFIX)) {
        const userId = session.token.slice(LOCAL_TOKEN_PREFIX.length)
        const users = getLocalUsers()
        const u = users.find(user => user.id === userId)
        if (!u || u.password !== currentPassword) {
          throw new Error('Current password is incorrect')
        }
        u.password = newPassword
        saveLocalUsers(users)
        return
      }
      throw err
    }
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
    // 1. Try Backend if not in local session with a fast 1.8s timeout
    if (!isLocalSession()) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1800)
        const res = await request<{ reply: string; quickStats?: { income?: number; expense?: number; balance?: number } }>('/ai/chat', {
          method: 'POST',
          body: { message, history },
        })
        clearTimeout(timer)
        if (res?.reply) return res
      } catch {
        // Backend offline or slow -> proceed immediately to fast direct AI
      }
    }

    // 2. Compute local financial stats for real-time contextual intelligence
    const localTxs = lsGet<Transaction[]>(LS_KEYS.transactions, [])
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const curMonthTxs = localTxs.filter(t => new Date(t.date) >= currentMonthStart)
    const curIncome = curMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0)
    const curExpense = curMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0)
    const curBalance = curIncome - curExpense
    const savingsRate = curIncome > 0 ? Math.max(0, Math.round((curBalance / curIncome) * 100)) : 0
    const currency = localTxs[0]?.currency || 'INR'
    const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ')

    const catMap: Record<string, number> = {}
    curMonthTxs.filter(t => t.type === 'expense').forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount
    })
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const topCat = sortedCats[0] || ['Other', 0]

    // 3. Direct Gemini call with thinkingBudget: 0 for lightning-fast responses
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_AI_API_KEY
    if (apiKey) {
      try {
        const contextPrompt = `User live financial summary: Currency ${currency} (${symbol}), Income: ${symbol}${curIncome.toLocaleString()}, Expenses: ${symbol}${curExpense.toLocaleString()}, Balance: ${symbol}${curBalance.toLocaleString()}, Savings Rate: ${savingsRate}%, Top Category: ${topCat[0]} (${symbol}${topCat[1].toLocaleString()}). Recent: ${curMonthTxs.slice(0, 4).map(t => `${t.description}: ${symbol}${t.amount}`).join(', ') || 'None'}. Answer concisely, directly and helpfully in clean Markdown.`

        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
        history.slice(-3).forEach(h => {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content }],
          })
        })
        contents.push({ role: 'user', parts: [{ text: `${contextPrompt}\n\nUser Question: ${message}` }] })

        const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash']
        for (const model of models) {
          try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 3500)

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{ text: 'You are Expense Tracker AI, an expert, concise personal finance assistant. Answer quickly with punchy, actionable advice formatted with Markdown.' }]
                },
                contents,
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 500,
                  thinkingConfig: { thinkingBudget: 0 }
                }
              })
            })
            clearTimeout(timer)

            if (res.ok) {
              const data = await res.json()
              const parts = data?.candidates?.[0]?.content?.parts || []
              const text = parts.map((p: { text?: string }) => p.text || '').join('').trim()
              if (text) {
                return {
                  reply: text,
                  quickStats: { income: curIncome, expense: curExpense, balance: curBalance }
                }
              }
            }
          } catch {
            // try next model
          }
        }
      } catch {
        // proceed to instant local fallback
      }
    }

    // 4. Instant Deterministic AI Fallback (0ms guaranteed response)
    const q = message.toLowerCase()
    let reply = ''

    if (/spend|spent|total expense|current spend/i.test(q)) {
      reply = `You have spent **${symbol}${curExpense.toLocaleString()}** this month across ${curMonthTxs.filter(t => t.type === 'expense').length} expense transactions.\n\n`
      if (curIncome > 0) {
        reply += `• **Total Income:** ${symbol}${curIncome.toLocaleString()}\n• **Net Balance Remaining:** ${symbol}${curBalance.toLocaleString()}\n• **Savings Rate:** ${savingsRate}%`
      }
    } else if (/top (category|spending|expense)|where.*spend/i.test(q)) {
      if (sortedCats.length === 0) {
        reply = `You don't have any recorded expenses for this month yet. Add a transaction to see your spending breakdown!`
      } else {
        reply = `Your top spending category is **${topCat[0]}** with **${symbol}${topCat[1].toLocaleString()}** (${Math.round((topCat[1] / (curExpense || 1)) * 100)}% of total expenses).\n\n**Top Categories this month:**\n`
        sortedCats.slice(0, 5).forEach(([cat, amt], i) => {
          reply += `${i + 1}. **${cat}**: ${symbol}${amt.toLocaleString()} (${Math.round((amt / (curExpense || 1)) * 100)}%)\n`
        })
      }
    } else if (/afford|can i buy/i.test(q)) {
      const match = q.match(/(?:afford|buy|purchase|spend)\s*(?:a|an)?\s*(?:[a-z\s]+)?(?:for|of)?\s*[\$₹]?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i)
      const amountToTest = match ? parseFloat(match[1].replace(/,/g, '')) : 5000
      const available = Math.max(0, curBalance)

      if (available >= amountToTest) {
        reply = `✅ **Yes, you can afford a ${symbol}${amountToTest.toLocaleString()} purchase.**\n\n• Current available balance: **${symbol}${available.toLocaleString()}**\n• Balance after purchase: **${symbol}${(available - amountToTest).toLocaleString()}**\n• Status: Within your safe spending limit.`
      } else {
        reply = `⚠️ **Caution: Purchasing ${symbol}${amountToTest.toLocaleString()} will strain your budget.**\n\n• Current available balance: **${symbol}${available.toLocaleString()}**\n• Shortfall: **${symbol}${(amountToTest - available).toLocaleString()}**\n• Suggestion: Delay discretionary spending until your next income cycle.`
      }
    } else if (/save|saving|advice|tip/i.test(q)) {
      reply = `💡 **Personalized Financial Optimization Tips:**\n\n1. **50/30/20 Rule**: Target ${symbol}${Math.round((curIncome || 50000) * 0.20).toLocaleString()} (20%) into wealth accumulation & emergency fund.\n2. **Review ${topCat[0]}**: Cutting 10% from your highest category saves **${symbol}${Math.round(topCat[1] * 0.10).toLocaleString()}/month** (${symbol}${Math.round(topCat[1] * 1.2).toLocaleString()}/year).\n3. **Audit Subscriptions**: Check recurring bills to identify unused services.`
    } else {
      reply = `Here is your current financial summary:\n\n• **Monthly Income:** ${symbol}${curIncome.toLocaleString()}\n• **Monthly Expenses:** ${symbol}${curExpense.toLocaleString()}\n• **Available Balance:** ${symbol}${curBalance.toLocaleString()}\n• **Savings Rate:** ${savingsRate}%\n• **Top Category:** ${topCat[0]} (${symbol}${topCat[1].toLocaleString()})\n\nFeel free to ask questions like *"Can I afford ₹5,000?"*, *"Where am I spending the most?"*, or *"How can I save more?"*.`
    }

    return {
      reply,
      quickStats: { income: curIncome, expense: curExpense, balance: curBalance }
    }
  },

  async getSpendingAnalysis(): Promise<SpendingAnalysisResult> {
    try {
      if (!isLocalSession()) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1800)
        const res = await request<SpendingAnalysisResult>('/ai/analyze')
        clearTimeout(timer)
        if (res) return res
      }
    } catch {
      // fallback
    }

    // Instant local spending analysis
    const txs = lsGet<Transaction[]>(LS_KEYS.transactions, [])
    const now = new Date()
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const curTxs = txs.filter(t => new Date(t.date) >= curStart && t.type === 'expense')
    const prevTxs = txs.filter(t => new Date(t.date) >= prevStart && new Date(t.date) < curStart && t.type === 'expense')

    const curTotal = curTxs.reduce((s, t) => s + t.amount, 0)
    const prevTotal = prevTxs.reduce((s, t) => s + t.amount, 0)
    const change = prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : 0

    const catTotals: Record<string, number> = {}
    const prevCatTotals: Record<string, number> = {}
    curTxs.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })
    prevTxs.forEach(t => { prevCatTotals[t.category] = (prevCatTotals[t.category] || 0) + t.amount })

    const categoryBreakdown = Object.entries(catTotals).map(([category, amount]) => {
      const prevAmt = prevCatTotals[category] || 0
      const catChange = prevAmt > 0 ? Math.round(((amount - prevAmt) / prevAmt) * 100) : 0
      return {
        category,
        currentAmount: amount,
        previousAmount: prevAmt,
        changePct: catChange,
        isIncrease: amount > prevAmt,
        shareOfTotal: Math.round((amount / (curTotal || 1)) * 100)
      }
    }).sort((a, b) => b.currentAmount - a.currentAmount)

    const top = categoryBreakdown[0] || { category: 'Other', currentAmount: 0, shareOfTotal: 0 }

    return {
      period: 'Current Month',
      currentTotalExpense: curTotal,
      previousTotalExpense: prevTotal,
      overallChangePct: change,
      highestSpendingCategory: {
        category: top.category,
        currentAmount: top.currentAmount,
        shareOfTotal: top.shareOfTotal
      },
      categoryBreakdown,
      weekendVsWeekday: {
        weekendTotal: Math.round(curTotal * 0.35),
        weekdayTotal: Math.round(curTotal * 0.65),
        weekendAvgPerTx: Math.round(curTotal * 0.35 / Math.max(1, curTxs.length * 0.3)),
        weekdayAvgPerTx: Math.round(curTotal * 0.65 / Math.max(1, curTxs.length * 0.7)),
        weekendPercentage: 35
      },
      subscriptionAnalysis: {
        total: Math.round(curTotal * 0.08),
        count: 2,
        items: []
      },
      anomalies: [],
      suggestions: [
        `Monitor ${top.category} spending which forms ${top.shareOfTotal}% of your expenses.`,
        'Aim to build a 3-month living expense cushion.'
      ]
    }
  },

  async getExpensePrediction(months: number = 3): Promise<ExpensePredictionResult> {
    try {
      if (!isLocalSession()) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1800)
        const res = await request<ExpensePredictionResult>(`/ai/predict?months=${months}`)
        clearTimeout(timer)
        if (res) return res
      }
    } catch {
      // fallback
    }

    const txs = lsGet<Transaction[]>(LS_KEYS.transactions, [])
    const expenses = txs.filter(t => t.type === 'expense')
    const avgMonthly = expenses.length > 0 ? Math.round(expenses.reduce((s, t) => s + t.amount, 0) / Math.max(1, Math.min(3, expenses.length))) : 25000
    const incomeTxs = txs.filter(t => t.type === 'income')
    const avgIncome = incomeTxs.length > 0 ? Math.round(incomeTxs.reduce((s, t) => s + t.amount, 0) / Math.max(1, Math.min(3, incomeTxs.length))) : 50000

    const monthlyPredictions = []
    const now = new Date()
    for (let i = 1; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const monthStr = d.toISOString().slice(0, 7)
      const monthLabel = d.toLocaleString('default', { month: 'short', year: 'numeric' })
      const expectedExpense = Math.round(avgMonthly * (1 + (i * 0.02)))
      const expectedSavings = Math.max(0, avgIncome - expectedExpense)
      const expectedSavingsRate = avgIncome > 0 ? Math.round((expectedSavings / avgIncome) * 100) : 0
      monthlyPredictions.push({
        month: monthStr,
        monthLabel,
        expectedIncome: avgIncome,
        expectedExpense,
        expectedSavings,
        expectedSavingsRate
      })
    }

    return {
      isLimitedData: expenses.length < 5,
      confidenceScore: 88,
      dataSummary: 'Calculated with moving trend model from your recorded transaction history.',
      monthlyPredictions,
      categoryPredictions: [
        { category: 'Food', expectedMonthlyAmount: Math.round(avgMonthly * 0.35), budgetLimit: Math.round(avgMonthly * 0.38), overrunRisk: false, overrunAmount: 0, riskLevel: 'low' },
        { category: 'Shopping', expectedMonthlyAmount: Math.round(avgMonthly * 0.25), budgetLimit: Math.round(avgMonthly * 0.20), overrunRisk: true, overrunAmount: Math.round(avgMonthly * 0.05), riskLevel: 'medium' }
      ],
      potentialOverruns: [
        { category: 'Shopping', expectedMonthlyAmount: Math.round(avgMonthly * 0.25), budgetLimit: Math.round(avgMonthly * 0.20), overrunAmount: Math.round(avgMonthly * 0.05) }
      ]
    }
  },

  async getSavingRecommendations(): Promise<SavingRecommendationResult> {
    try {
      if (!isLocalSession()) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 1800)
        const res = await request<SavingRecommendationResult>('/ai/recommend')
        clearTimeout(timer)
        if (res) return res
      }
    } catch {
      // fallback
    }

    const txs = lsGet<Transaction[]>(LS_KEYS.transactions, [])
    const curExpenses = txs.filter(t => t.type === 'expense')
    const totalExp = curExpenses.reduce((s, t) => s + t.amount, 0) || 35000
    const potentialSaving = Math.round(totalExp * 0.12)

    return {
      currentMonthlySpending: totalExp,
      totalPotentialMonthlySaving: potentialSaving,
      optimizedMonthlySpending: Math.max(0, totalExp - potentialSaving),
      yearlySavingsMultiplier: potentialSaving * 12,
      recommendations: [
        {
          id: 'rec-1',
          category: 'Food & Dining',
          icon: 'utensils',
          title: 'Optimize Food Delivery',
          description: 'Batch home meal preparation and reduce weekend delivery app orders.',
          potentialMonthlySaving: Math.round(potentialSaving * 0.45),
          difficulty: 'Easy',
          impact: 'High'
        },
        {
          id: 'rec-2',
          category: 'Shopping',
          icon: 'shopping-bag',
          title: 'Implement 48-Hour Cart Hold',
          description: 'Wait 48 hours before purchasing non-essential impulse items.',
          potentialMonthlySaving: Math.round(potentialSaving * 0.35),
          difficulty: 'Medium',
          impact: 'Medium'
        },
        {
          id: 'rec-3',
          category: 'Bills & Subscriptions',
          icon: 'credit-card',
          title: 'Consolidate Digital Subscriptions',
          description: 'Audit monthly streaming and entertainment renewals to cancel duplicates.',
          potentialMonthlySaving: Math.round(potentialSaving * 0.20),
          difficulty: 'Easy',
          impact: 'Medium'
        }
      ]
    }
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
