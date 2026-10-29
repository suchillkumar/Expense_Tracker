import { useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { formatMoney } from '../services/currencyService'
import { Transaction, TransactionType } from '../types'
import { TransactionForm } from './Transactions/TransactionForm'
import { DeleteTransactionModal } from './Transactions/DeleteTransactionModal'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts'

interface DashboardProps {
  onNavigate: (viewKey: string) => void
  onOpenAdd?: (type?: TransactionType) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Bills: '⚡',
  Entertainment: '🎬',
  Education: '📚',
  Healthcare: '💊',
  Travel: '✈️',
  Salary: '💼',
  Freelance: '💻',
  Investments: '📈',
  Rent: '🏠',
  Other: '📦',
}

const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F97316',
  Transport: '#0EA5E9',
  Shopping: '#EC4899',
  Bills: '#EAB308',
  Entertainment: '#A855F7',
  Education: '#3B82F6',
  Healthcare: '#10B981',
  Travel: '#06B6D4',
  Salary: '#2563EB',
  Freelance: '#0284C7',
  Rent: '#6366F1',
  Other: '#64748B',
}

type TimeScale = 'weekly' | 'monthly' | 'yearly'

export function Dashboard({ onNavigate, onOpenAdd }: DashboardProps) {
  const { user } = useAuth()
  const {
    transactions,
    budgets,
    currency,
    summary,
    loadDemoData,
  } = useExpense()
  const toast = useToast()
  const { isDark } = useTheme()

  const [showBalance, setShowBalance] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly')
  const [loadingDemo, setLoadingDemo] = useState(false)
  const [recentSearch, setRecentSearch] = useState('')
  const [recentCatFilter, setRecentCatFilter] = useState('all')

  // Modals state
  const [transactionModal, setTransactionModal] = useState<{
    open: boolean
    presetType: TransactionType
    editing: Transaction | null
  }>({ open: false, presetType: 'expense', editing: null })

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    transaction: Transaction | null
  }>({ open: false, transaction: null })

  // Dynamic Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  // Month-over-Month calculations
  const momStats = useMemo(() => {
    const now = new Date()
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    let thisMonthInc = 0
    let thisMonthExp = 0
    let lastMonthInc = 0
    let lastMonthExp = 0

    transactions.forEach((tx) => {
      const ym = tx.date.substring(0, 7)
      if (ym === thisMonthStr) {
        if (tx.type === 'income') thisMonthInc += tx.amount
        else thisMonthExp += tx.amount
      } else if (ym === lastMonthStr) {
        if (tx.type === 'income') lastMonthInc += tx.amount
        else lastMonthExp += tx.amount
      }
    })

    const incMoM = lastMonthInc > 0 ? Math.round(((thisMonthInc - lastMonthInc) / lastMonthInc) * 100) : 0
    const expMoM = lastMonthExp > 0 ? Math.round(((thisMonthExp - lastMonthExp) / lastMonthExp) * 100) : 0

    return { incMoM, expMoM }
  }, [transactions])

  // Total budget and spending for selected month
  const monthlyBudgetStats = useMemo(() => {
    const totalBudgetLimit = budgets
      .filter((b) => !b.month || b.month === selectedMonth)
      .reduce((sum, b) => sum + b.limitAmount, 0)

    const totalMonthExpense = transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(selectedMonth))
      .reduce((sum, t) => sum + t.amount, 0)

    const remainingBudget = Math.max(0, totalBudgetLimit - totalMonthExpense)
    const pctSpent = totalBudgetLimit > 0 ? Math.min(100, Math.round((totalMonthExpense / totalBudgetLimit) * 100)) : 0

    return { totalBudgetLimit, totalMonthExpense, remainingBudget, pctSpent }
  }, [budgets, transactions, selectedMonth])

  // Chart Data: Weekly | Monthly | Yearly
  const mainChartData = useMemo(() => {
    const now = new Date()

    if (timeScale === 'weekly') {
      const days: { label: string; income: number; expense: number; savings: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString([], { weekday: 'short' })

        let inc = 0
        let exp = 0
        transactions.forEach((tx) => {
          if (tx.date.startsWith(dateStr)) {
            if (tx.type === 'income') inc += tx.amount
            else exp += tx.amount
          }
        })
        days.push({ label, income: inc, expense: exp, savings: Math.max(0, inc - exp) })
      }
      return days
    }

    if (timeScale === 'yearly') {
      const currentYear = now.getFullYear()
      const years: { label: string; income: number; expense: number; savings: number }[] = []
      for (let y = currentYear - 4; y <= currentYear; y++) {
        let inc = 0
        let exp = 0
        transactions.forEach((tx) => {
          if (new Date(tx.date).getFullYear() === y) {
            if (tx.type === 'income') inc += tx.amount
            else exp += tx.amount
          }
        })
        years.push({ label: String(y), income: inc, expense: exp, savings: Math.max(0, inc - exp) })
      }
      return years
    }

    // Default: Monthly (Past 6 Months)
    const months: { label: string; income: number; expense: number; savings: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString([], { month: 'short' })
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      let inc = 0
      let exp = 0
      transactions.forEach((tx) => {
        if (tx.date.startsWith(ym)) {
          if (tx.type === 'income') inc += tx.amount
          else exp += tx.amount
        }
      })
      months.push({ label, income: inc, expense: exp, savings: Math.max(0, inc - exp) })
    }
    return months
  }, [transactions, timeScale])

  // Category Breakdown for current month
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {}
    let monthTotalExp = 0

    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.date.startsWith(selectedMonth)) {
        catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount
        monthTotalExp += tx.amount
      }
    })

    if (monthTotalExp === 0) {
      transactions.forEach((tx) => {
        if (tx.type === 'expense') {
          catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount
          monthTotalExp += tx.amount
        }
      })
    }

    return Object.entries(catMap)
      .map(([name, value]) => ({
        name,
        value,
        percent: monthTotalExp > 0 ? Math.round((value / monthTotalExp) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, selectedMonth])

  // Filtered recent transactions for mobile home feed
  const recentTransactions = useMemo(() => {
    let list = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (recentSearch.trim()) {
      const q = recentSearch.toLowerCase()
      list = list.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    if (recentCatFilter !== 'all') {
      list = list.filter((t) => t.category === recentCatFilter)
    }
    return list.slice(0, 6)
  }, [transactions, recentSearch, recentCatFilter])

  // Category budgets progress
  const budgetProgress = useMemo(() => {
    return budgets
      .filter((b) => !b.month || b.month === selectedMonth)
      .map((b) => {
        const spent = transactions
          .filter((t) => t.type === 'expense' && t.category === b.category && t.date.startsWith(selectedMonth))
          .reduce((sum, t) => sum + t.amount, 0)

        const limit = b.limitAmount || 1
        const percent = Math.min(100, Math.round((spent / limit) * 100))
        const remaining = Math.max(0, limit - spent)
        const isOver = spent > limit

        return {
          ...b,
          spent,
          percent,
          remaining,
          isOver,
        }
      })
  }, [budgets, transactions, selectedMonth])

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      await loadDemoData()
      toast.success('Successfully loaded 12 months of live demonstration financial records!')
    } catch {
      toast.error('Failed to populate demo dataset')
    } finally {
      setLoadingDemo(false)
    }
  }

  const handleOpenAddForm = (t: TransactionType) => {
    if (onOpenAdd) {
      onOpenAdd(t)
    } else {
      setTransactionModal({ open: true, presetType: t, editing: null })
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── 1. Mobile-First Greeting & Month Selector Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-blue-500/20 shrink-0">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {greeting}, {user?.name ? user.name.split(' ')[0] : 'Friend'} 👋
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personal Financial Overview & Insights
            </p>
          </div>
        </div>

        {/* Month Selector & Quick Settings */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs outline-none cursor-pointer"
            >
              <option value={new Date().toISOString().slice(0, 7)}>Current Month</option>
              {[1, 2, 3, 4, 5].map((offset) => {
                const d = new Date()
                d.setMonth(d.getMonth() - offset)
                const val = d.toISOString().slice(0, 7)
                const label = d.toLocaleDateString([], { month: 'short', year: 'numeric' })
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                )
              })}
            </select>
          </div>

          <button
            onClick={() => onNavigate('profile')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Account Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── 2. Master Financial Overview Card (Fintech Midnight Gradient) ── */}
      <div className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#0B1528] via-[#0F1E38] to-[#1E293B] text-white shadow-xl shadow-slate-950/20 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-5">
          {/* Top Label & Eye Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Total Net Balance</span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-slate-400 hover:text-white transition-colors text-xs"
                title={showBalance ? 'Hide Balance' : 'Show Balance'}
              >
                {showBalance ? '👁️' : '🙈'}
              </button>
            </div>

            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {summary.balance >= 0 ? 'Surplus' : 'Deficit'}
            </span>
          </div>

          {/* Main Balance Figure */}
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-numbers">
              {showBalance ? formatMoney(summary.balance, currency) : '••••••••'}
            </p>
            <p className="text-xs text-slate-400 mt-1">Available across all recorded accounts</p>
          </div>

          {/* Inflows & Outflows Breakdown Row */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
            {/* Inflows */}
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Inflows</span>
                <span className="text-emerald-400 text-xs">💰</span>
              </div>
              <p className="text-lg font-bold text-emerald-400 mt-1 tabular-numbers">
                +{formatMoney(summary.income, currency)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {momStats.incMoM >= 0 ? `▲ +${momStats.incMoM}%` : `▼ ${momStats.incMoM}%`} vs last mo
              </p>
            </div>

            {/* Outflows */}
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Expenses</span>
                <span className="text-rose-400 text-xs">🔴</span>
              </div>
              <p className="text-lg font-bold text-rose-400 mt-1 tabular-numbers">
                −{formatMoney(summary.expenses, currency)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {momStats.expMoM <= 0 ? `▼ -${Math.abs(momStats.expMoM)}%` : `▲ +${momStats.expMoM}%`} vs last mo
              </p>
            </div>
          </div>

          {/* Remaining Budget & Spending Progress */}
          {monthlyBudgetStats.totalBudgetLimit > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Monthly Budget: <span className="font-semibold text-white">{formatMoney(monthlyBudgetStats.remainingBudget, currency)} remaining</span>
                </span>
                <span className="font-bold text-slate-300">{monthlyBudgetStats.pctSpent}% spent</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    monthlyBudgetStats.pctSpent >= 90
                      ? 'bg-rose-500'
                      : monthlyBudgetStats.pctSpent >= 75
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                  style={{ width: `${monthlyBudgetStats.pctSpent}%` }}
                />
              </div>
            </div>
          )}

          {/* Direct Mobile Quick Action Buttons on Card */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handleOpenAddForm('expense')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🔴</span>
              <span>+ Add Expense</span>
            </button>

            <button
              onClick={() => handleOpenAddForm('income')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>💰</span>
              <span>+ Add Income</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Empty State Demo Populator Banner ── */}
      {transactions.length === 0 && (
        <div className="fintech-card p-6 flex flex-wrap items-center justify-between gap-4 border-dashed border-2 border-blue-300 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
              ⚡ Quick Start Demonstration
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">No financial transactions recorded yet</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Click below to immediately populate 12 months of realistic cashflows, category budgets, and AI insights.
            </p>
          </div>
          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 cursor-pointer"
          >
            {loadingDemo ? 'Populating Records...' : 'Load 12-Month Demo Dataset →'}
          </button>
        </div>
      )}

      {/* ── 3. Touch-Friendly Quick Action Grid ── */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
          Quick Actions & Destinations
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          <button
            onClick={() => onNavigate('transactions')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              💸
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Activity</span>
            <span className="text-[10px] text-slate-400">All Ledger</span>
          </button>

          <button
            onClick={() => onNavigate('budgets')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Budgets</span>
            <span className="text-[10px] text-slate-400">Limits & Caps</span>
          </button>

          <button
            onClick={() => onNavigate('analytics')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              📈
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Analytics</span>
            <span className="text-[10px] text-slate-400">Deep Charts</span>
          </button>

          <button
            onClick={() => onNavigate('goals')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              🏆
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Goals</span>
            <span className="text-[10px] text-slate-400">Milestones</span>
          </button>

          <button
            onClick={() => onNavigate('ai-assistant')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Advisor</span>
            <span className="text-[10px] text-slate-400">Smart Tips</span>
          </button>

          <button
            onClick={() => onNavigate('reports')}
            className="fintech-card p-3 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-lg mb-1.5 group-hover:scale-110 transition-transform">
              📑
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Reports</span>
            <span className="text-[10px] text-slate-400">CSV & PDF</span>
          </button>
        </div>
      </div>

      {/* ── 4. Charts Section: Cashflow & Category Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Cashflow Chart */}
        <div className="fintech-card p-5 sm:p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Income vs Expenses vs Savings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cashflow distribution and historical net growth
              </p>
            </div>

            {/* TimeScale Filter Pill */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200/80 dark:border-slate-700/80">
              {(['weekly', 'monthly', 'yearly'] as TimeScale[]).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setTimeScale(scale)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    timeScale === scale
                      ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mainChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={isDark ? 0.1 : 0.08} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [formatMoney(Number(val) || 0, currency), '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#111827' : '#FFFFFF',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #1F2937' : '1px solid #E2E8F0',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: 600,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  iconType="circle"
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#F43F5E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Expense Breakdown Donut Chart */}
        <div className="fintech-card p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Expense Breakdown</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Category distribution</p>
            </div>
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              {selectedMonth}
            </span>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
              <span>🍩 No expense records for this period.</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#64748B'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatMoney(Number(val) || 0, currency)}
                      contentStyle={{
                        backgroundColor: isDark ? '#111827' : '#FFFFFF',
                        borderRadius: '12px',
                        border: isDark ? '1px solid #1F2937' : '1px solid #E2E8F0',
                        color: isDark ? '#FFFFFF' : '#0F172A',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category Legend List */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {categoryData.slice(0, 5).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#64748B' }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {CATEGORY_ICONS[item.name] || '📦'} {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-500 dark:text-slate-400 tabular-numbers font-medium">
                        {item.percent}%
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white tabular-numbers">
                        {formatMoney(item.value, currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Category Budget Health Indicators ── */}
      {budgetProgress.length > 0 && (
        <div className="fintech-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Active Budget Caps</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Category spending thresholds & alerts
              </p>
            </div>
            <button
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage All →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {budgetProgress.slice(0, 6).map((b) => (
              <div
                key={b.id || b.category}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CATEGORY_ICONS[b.category] || '📦'}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.category}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.isOver
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                        : b.percent >= 80
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                        : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {b.percent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold text-slate-900 dark:text-white tabular-numbers">
                    {formatMoney(b.spent, currency)}
                  </span>
                  <span className="text-slate-400 tabular-numbers text-[11px]">
                    limit {formatMoney(b.limitAmount, currency)}
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.isOver ? 'bg-rose-500' : b.percent >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${b.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 6. Mobile-First Recent Activity Feed ── */}
      <div className="fintech-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Latest cashflows across your accounts
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Search..."
              value={recentSearch}
              onChange={(e) => setRecentSearch(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 outline-none w-28 sm:w-36"
            />
            <select
              value={recentCatFilter}
              onChange={(e) => setRecentCatFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 outline-none font-medium"
            >
              <option value="all">All</option>
              {Object.keys(CATEGORY_ICONS).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              View All ({transactions.length}) →
            </button>
          </div>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>No transactions found matching your criteria.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3 flex items-center justify-between gap-3 group transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2"
              >
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {CATEGORY_ICONS[tx.category] || '📦'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{tx.category}</span>
                      <span>•</span>
                      <span>{new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                      {tx.paymentMethod && (
                        <>
                          <span>•</span>
                          <span>{tx.paymentMethod}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`font-bold text-xs sm:text-sm tabular-numbers ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '−'}
                    {formatMoney(tx.amount, currency)}
                  </span>

                  <div className="flex items-center gap-1 opacity-75 group-hover:opacity-100">
                    <button
                      onClick={() => setTransactionModal({ open: true, presetType: tx.type, editing: tx })}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => setDeleteModal({ open: true, transaction: tx })}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Transaction Add/Edit Modal Dialog ── */}
      {transactionModal.open && (
        <TransactionForm
          initial={transactionModal.editing}
          presetType={transactionModal.presetType}
          onClose={() => setTransactionModal({ open: false, presetType: 'expense', editing: null })}
        />
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteModal.open && deleteModal.transaction && (
        <DeleteTransactionModal
          transaction={deleteModal.transaction}
          onClose={() => setDeleteModal({ open: false, transaction: null })}
        />
      )}
    </div>
  )
}
