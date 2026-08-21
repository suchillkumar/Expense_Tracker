import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { api } from '../services/api'
import { useAuth } from './AuthContext'
import {
  AppNotification,
  Budget,
  Transaction
} from '../types'

interface ExpenseContextValue {
  ready: boolean
  transactions: Transaction[]
  budgets: Budget[]
  notifications: AppNotification[]
  currency: string
  unreadNotificationCount: number
  summary: {
    income: number
    expenses: number
    balance: number
    savings: number
    savingsRate: number
    incomeCount: number
    expenseCount: number
  }
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<Transaction>
  updateTransaction: (tx: Transaction) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  importTransactions: (rows: Omit<Transaction, 'id'>[]) => Promise<number>
  saveBudget: (budget: Budget) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>
  loadDemoData: () => Promise<void>
  notify: (message: string, type?: 'alert' | 'info' | 'warning', title?: string) => Promise<void>
  markNotificationsRead: () => Promise<void>
  refreshAll: () => Promise<void>
}

const ExpenseContext = createContext<ExpenseContextValue | undefined>(undefined)

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const currency = user?.preferredCurrency || 'INR'

  const loadData = async () => {
    const [txs, buds, notifs] = await Promise.allSettled([
      api.getTransactions(),
      api.getBudgets(),
      api.getNotifications()
    ])
    if (txs.status === 'fulfilled') setTransactions(txs.value)
    if (buds.status === 'fulfilled') setBudgets(buds.value)
    if (notifs.status === 'fulfilled') setNotifications(notifs.value)
  }

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setReady(false)
      setTransactions([])
      setBudgets([])
      setNotifications([])
      return
    }
    setReady(false)
    loadData().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => { cancelled = true }
  }, [user?.id])

  const refreshAll = async () => {
    await loadData()
  }

  const notify: ExpenseContextValue['notify'] = async (message, type = 'info', title = 'Expense Tracker Alert') => {
    await api.addNotification({ message, type, title })
    const updated = await api.getNotifications()
    setNotifications(updated)
  }

  const budgetsRef = useRef(budgets)
  budgetsRef.current = budgets

  // Check budget thresholds dynamically on transaction additions
  const checkBudgetThreshold = (tx: Omit<Transaction, 'id'>) => {
    if (tx.type !== 'expense' || tx.amount <= 0) return
    const month = new Date(tx.date).toISOString().slice(0, 7)
    const matchedBudget = budgetsRef.current.find((b) => b.category === tx.category && b.month === month)
    if (!matchedBudget) return

    const currentSpent = matchedBudget.spentAmount || 0
    const newSpent = currentSpent + tx.amount
    const limit = matchedBudget.limitAmount

    if (limit > 0) {
      const usagePct = Math.round((newSpent / limit) * 100)
      if (newSpent >= limit) {
        notify(`You have exceeded your ${tx.category} budget of ${limit.toLocaleString()}. Total spent: ${newSpent.toLocaleString()} (${usagePct}%).`, 'alert', '⚠️ Budget Exceeded')
      } else if (newSpent >= limit * 0.9) {
        notify(`Warning: You're close to exceeding your ${tx.category} budget (${usagePct}% spent).`, 'warning', '⚡ Near Budget Limit (90%)')
      } else if (newSpent >= limit * 0.75 && currentSpent < limit * 0.75) {
        notify(`Your ${tx.category} spending has reached ${usagePct}% of your budget limit.`, 'info', '📊 Budget Alert (75%)')
      } else if (newSpent >= limit * 0.5 && currentSpent < limit * 0.5) {
        notify(`You're halfway through your ${tx.category} budget.`, 'info', '💡 Budget Alert (50%)')
      }
    }
  }

  const addTransaction = async (tx: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const fakeId = `temp-${crypto.randomUUID()}`
    const tempTx: Transaction = { ...tx, id: fakeId }
    setTransactions((prev) => [tempTx, ...prev])

    try {
      const created = await api.addTransaction(tx)
      const fresh = await api.getTransactions()
      const freshBudgets = await api.getBudgets()
      setTransactions(fresh)
      setBudgets(freshBudgets)
      checkBudgetThreshold(tx)
      return created
    } catch (err) {
      setTransactions((prev) => prev.filter((t) => t.id !== fakeId))
      throw err
    }
  }

  const updateTransaction = async (tx: Transaction): Promise<Transaction> => {
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
    try {
      const updated = await api.updateTransaction(tx)
      const fresh = await api.getTransactions()
      const freshBudgets = await api.getBudgets()
      setTransactions(fresh)
      setBudgets(freshBudgets)
      return updated
    } catch (err) {
      await loadData()
      throw err
    }
  }

  const deleteTransaction = async (id: string): Promise<void> => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
    try {
      await api.deleteTransaction(id)
      const fresh = await api.getTransactions()
      const freshBudgets = await api.getBudgets()
      setTransactions(fresh)
      setBudgets(freshBudgets)
    } catch (err) {
      await loadData()
      throw err
    }
  }

  const importTransactions = async (rows: Omit<Transaction, 'id'>[]): Promise<number> => {
    const { count } = await api.importTransactions(rows)
    const fresh = await api.getTransactions()
    const freshBudgets = await api.getBudgets()
    setTransactions(fresh)
    setBudgets(freshBudgets)
    return count
  }

  const saveBudget = async (budget: Budget): Promise<Budget> => {
    const saved = await api.saveBudget(budget)
    const freshBudgets = await api.getBudgets()
    setBudgets(freshBudgets)
    return saved
  }

  const deleteBudget = async (id: string): Promise<void> => {
    await api.deleteBudget(id)
    const freshBudgets = await api.getBudgets()
    setBudgets(freshBudgets)
  }

  const loadDemoData = async (): Promise<void> => {
    await api.loadDemoData()
    await loadData()
  }

  const markNotificationsRead = async () => {
    await api.markNotificationsRead()
    const updated = await api.getNotifications()
    setNotifications(updated)
  }

  // Summary Metrics (Current Month)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const summary = useMemo(() => {
    const monthTxs = transactions.filter((t) => t.date.slice(0, 7) === currentMonth)
    const incomeTxs = monthTxs.filter((t) => t.type === 'income')
    const expenseTxs = monthTxs.filter((t) => t.type === 'expense')

    const income = incomeTxs.reduce((s, t) => s + t.amount, 0)
    const expenses = expenseTxs.reduce((s, t) => s + t.amount, 0)
    const balance = income - expenses
    const savings = Math.max(0, balance)
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0

    return {
      income,
      expenses,
      balance,
      savings,
      savingsRate,
      incomeCount: incomeTxs.length,
      expenseCount: expenseTxs.length,
    }
  }, [transactions, currentMonth])

  const unreadNotificationCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length
  }, [notifications])

  const value = useMemo(
    () => ({
      ready,
      transactions,
      budgets,
      notifications,
      currency,
      unreadNotificationCount,
      summary,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      importTransactions,
      saveBudget,
      deleteBudget,
      loadDemoData,
      notify,
      markNotificationsRead,
      refreshAll
    }),
    [ready, transactions, budgets, notifications, currency, unreadNotificationCount, summary]
  )

  return <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
}

export function useExpense(): ExpenseContextValue {
  const ctx = useContext(ExpenseContext)
  if (!ctx) throw new Error('useExpense must be used within ExpenseProvider')
  return ctx
}
