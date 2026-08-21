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
  Other: '#64748B',
}

type TimeScale = 'weekly' | 'monthly' | 'yearly'

export function Dashboard({ onNavigate }: DashboardProps) {
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

  const totalIncome = summary.income
  const totalExpenses = summary.expenses
  const balance = summary.balance
  const savings = summary.savings
  const savingsRate = summary.savingsRate
  const [loadingDemo, setLoadingDemo] = useState(false)

  const [timeScale, setTimeScale] = useState<TimeScale>('monthly')

  // Transaction Modal State
  const [transactionModal, setTransactionModal] = useState<{
    open: boolean
    presetType: TransactionType
    editing: Transaction | null
  }>({ open: false, presetType: 'expense', editing: null })

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean
    transaction: Transaction | null
  }>({ open: false, transaction: null })

  // Dynamic Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning 👋'
    if (hour < 17) return 'Good Afternoon 👋'
    return 'Good Evening 👋'
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

  // Chart Data: Weekly | Monthly | Yearly
  const mainChartData = useMemo(() => {
    const now = new Date()

    if (timeScale === 'weekly') {
      // Last 7 days breakdown
      const days: { label: string; income: number; expense: number; savings: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().split('T')[0]
        const label = d.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' })

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
      // Last 5 Years breakdown
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
      const label = d.toLocaleDateString([], { month: 'short', year: '2-digit' })
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      let inc = 0
      let exp = 0
      transactions.forEach((tx) => {
        if (tx.date.substring(0, 7) === ym) {
          if (tx.type === 'income') inc += tx.amount
          else exp += tx.amount
        }
      })
      months.push({ label, income: inc, expense: exp, savings: Math.max(0, inc - exp) })
    }
    return months
  }, [transactions, timeScale])

  // Expense Donut Data with Top Categories
  const categoryData = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const map: Record<string, number> = {}

    transactions.forEach((tx) => {
      if (tx.type === 'expense' && tx.date.substring(0, 7) === thisMonth) {
        map[tx.category] = (map[tx.category] || 0) + tx.amount
      }
    })

    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Budget Progress items
  const budgetProgress = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    return budgets.map((b) => {
      const spent = transactions
        .filter((tx) => tx.type === 'expense' && tx.category === b.category && tx.date.substring(0, 7) === thisMonth)
        .reduce((sum, tx) => sum + tx.amount, 0)

      const limit = b.limitAmount || 1
      const percent = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0
      const remaining = Math.max(0, limit - spent)
      const isOver = spent > limit

      let color = '#10B981' // Green (<70%)
      let status: 'safe' | 'warning' | 'danger' = 'safe'

      if (spent >= limit) {
        color = '#EF4444' // Red (>100%)
        status = 'danger'
      } else if (percent >= 70) {
        color = '#F59E0B' // Amber (70-90%)
        status = 'warning'
      }

      return {
        ...b,
        spent,
        percent,
        remaining,
        isOver,
        color,
        status,
      }
    })
  }, [budgets, transactions])

  // Recent 5 Transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6)
  }, [transactions])

  const handleLoadDemo = async () => {
    setLoadingDemo(true)
    try {
      await loadDemoData()
      toast.success('Loaded 12 months of realistic financial transactions!')
    } catch {
      toast.error('Failed to load demo data.')
    } finally {
      setLoadingDemo(false)
    }
  }

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* ── 1. Top Hero Section ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">
            {greeting} {user?.name ? user.name.split(' ')[0] : ''}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] dark:text-slate-400 mt-1 font-medium">
            Your financial overview
          </p>
        </div>

        {/* ── Quick Action Buttons (Section 9) ── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setTransactionModal({ open: true, presetType: 'expense', editing: null })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>🔴</span> + Add Expense
          </button>
          <button
            onClick={() => setTransactionModal({ open: true, presetType: 'income', editing: null })}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>💰</span> + Add Income
          </button>
          <button
            onClick={() => onNavigate('budgets')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#262626] text-[#0F172A] dark:text-white text-xs font-bold hover:bg-slate-50 dark:hover:bg-[#222222] transition-all"
          >
            <span>🎯</span> Create Budget
          </button>
          <button
            onClick={() => onNavigate('budgets')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-purple-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>✨</span> AI Budget
          </button>
        </div>
      </div>

      {/* ── Demo Data Banner for empty state ── */}
      {transactions.length === 0 && (
        <div className="fintech-card bg-white dark:bg-[#121212] p-6 flex flex-wrap items-center justify-between gap-4 border-dashed border-2 border-[#E2E8F0] dark:border-[#262626]">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400">
              ⚡ Quick Start
            </span>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white mt-1.5">No transactions yet</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Click below to load sample transactions, AI budget plans, and analytics charts.
            </p>
          </div>
          <button
            onClick={handleLoadDemo}
            disabled={loadingDemo}
            className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
          >
            {loadingDemo ? 'Populating...' : '⚡ Load 12-Month Demo Data'}
          </button>
        </div>
      )}

      {/* ── 2. Four Premium KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Income */}
        <div className="fintech-card fintech-card-hover p-5 relative overflow-hidden border-t-3 border-t-[#10B981]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">Total Income</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#10B981] flex items-center justify-center text-base font-bold">
              💰
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight mt-3 tabular-numbers">
            {formatMoney(totalIncome, currency)}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold">
            <span className={`flex items-center gap-0.5 ${momStats.incMoM >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {momStats.incMoM >= 0 ? '▲' : '▼'} {Math.abs(momStats.incMoM)}%
            </span>
            <span className="text-[#64748B] dark:text-slate-500 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="fintech-card fintech-card-hover p-5 relative overflow-hidden border-t-3 border-t-[#EF4444]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">Total Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/60 text-[#EF4444] flex items-center justify-center text-base font-bold">
              🔴
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#0F172A] dark:text-white tracking-tight mt-3 tabular-numbers">
            {formatMoney(totalExpenses, currency)}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold">
            <span className={`flex items-center gap-0.5 ${momStats.expMoM <= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {momStats.expMoM <= 0 ? '▼' : '▲'} {Math.abs(momStats.expMoM)}%
            </span>
            <span className="text-[#64748B] dark:text-slate-500 font-normal">vs last month</span>
          </div>
        </div>

        {/* Card 3: Remaining Balance */}
        <div className="fintech-card fintech-card-hover p-5 relative overflow-hidden border-t-3 border-t-[#2563EB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">Remaining Balance</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] flex items-center justify-center text-base font-bold">
              💳
            </div>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-black tracking-tight mt-3 tabular-numbers ${
              balance >= 0 ? 'text-[#0F172A] dark:text-white' : 'text-[#EF4444]'
            }`}
          >
            {formatMoney(balance, currency)}
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-bold text-[#64748B] dark:text-slate-500">
            <span>Net cash available</span>
          </div>
        </div>

        {/* Card 4: Total Savings */}
        <div className="fintech-card fintech-card-hover p-5 relative overflow-hidden border-t-3 border-t-[#10B981]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">Total Savings</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#10B981] flex items-center justify-center text-base font-bold">
              💚
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-[#10B981] tracking-tight mt-3 tabular-numbers">
            {formatMoney(savings, currency)}
          </p>
          <div className="mt-2.5 space-y-1">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-[#64748B] dark:text-slate-400">Savings Rate</span>
              <span className="text-[#10B981]">{savingsRate}%</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(savingsRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Visualization (Income vs Expense vs Savings) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Bar Chart with Weekly | Monthly | Yearly filters */}
        <div className="lg:col-span-2 fintech-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">
                Income vs Expense vs Savings
              </h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Cashflow distribution and net savings
              </p>
            </div>

            {/* Time Filter Tabs: Weekly | Monthly | Yearly */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#18181B] p-1 rounded-xl border border-[#E2E8F0] dark:border-[#262626] self-start sm:self-auto">
              {(['weekly', 'monthly', 'yearly'] as TimeScale[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTimeScale(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    timeScale === tab
                      ? 'bg-white dark:bg-[#000000] text-[#2563EB] dark:text-blue-400 shadow-xs border border-transparent dark:border-[#262626]'
                      : 'text-[#64748B] hover:text-[#0F172A] dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={mainChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => [formatMoney(Number(val) || 0, currency), '']}
                  contentStyle={{
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderRadius: '12px',
                    border: isDark ? '1px solid #262626' : '1px solid #E2E8F0',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    fontSize: '11px',
                    fontWeight: 600,
                    boxShadow: isDark
                      ? '0 10px 25px -5px rgba(0,0,0,0.8)'
                      : '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                  iconType="circle"
                />
                <Bar dataKey="income" name="Income" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 1 Col: Expense Breakdown Donut Chart with Center Total and Side Legend */}
        <div className="fintech-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">Expense Breakdown</h2>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Top categories this month</p>
            </div>
            <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
              This Month
            </span>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#64748B] dark:text-slate-400">
              <span>🍩 No expense records for this month.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Donut Chart with Center Total */}
              <div className="h-44 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={50}
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
                        backgroundColor: isDark ? '#000000' : '#FFFFFF',
                        borderRadius: '12px',
                        border: isDark ? '1px solid #262626' : '1px solid #E2E8F0',
                        color: isDark ? '#FFFFFF' : '#0F172A',
                        fontSize: '11px',
                        fontWeight: 600,
                        boxShadow: isDark
                          ? '0 10px 25px -5px rgba(0,0,0,0.8)'
                          : '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Total in Donut Hole */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase tracking-wider text-[#64748B] font-bold">Total Expenses</span>
                  <span className="text-sm font-black text-[#0F172A] dark:text-white tabular-numbers">
                    {formatMoney(totalExpenses, currency)}
                  </span>
                </div>
              </div>

              {/* Category Legend beside / below */}
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#64748B' }}
                      />
                      <span className="font-semibold text-[#0F172A] dark:text-slate-200 truncate">
                        {CATEGORY_ICONS[item.name] || '📦'} {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[#64748B] dark:text-slate-400 font-medium tabular-numbers">
                        {item.percent}%
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-white tabular-numbers">
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

      {/* ── 4. Budget Visualization Section (Horizontal Cards) ── */}
      <div className="fintech-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">Budget Tracking</h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Live category utilization and remaining spending caps
            </p>
          </div>
          <button
            onClick={() => onNavigate('budgets')}
            className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Manage All Budgets →
          </button>
        </div>

        {budgetProgress.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B] dark:text-zinc-400">
            <span>🎯 No budgets configured. Click "Create Budget" to set category limits.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetProgress.slice(0, 6).map((b) => (
              <div
                key={b.id || b.category}
                className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#262626] shadow-xs space-y-2.5 transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{CATEGORY_ICONS[b.category] || '📦'}</span>
                    <span className="text-xs font-bold text-[#0F172A] dark:text-white">{b.category}</span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      b.isOver
                        ? 'bg-red-50 text-[#EF4444] dark:bg-red-950/60'
                        : b.status === 'warning'
                        ? 'bg-amber-50 text-[#F59E0B] dark:bg-amber-950/60'
                        : 'bg-emerald-50 text-[#10B981] dark:bg-emerald-950/60'
                    }`}
                  >
                    {b.percent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between text-xs font-semibold">
                  <span className="text-[#0F172A] dark:text-white tabular-numbers">
                    {formatMoney(b.spent, currency)}
                  </span>
                  <span className="text-[#64748B] dark:text-zinc-400 tabular-numbers">
                    / {formatMoney(b.limitAmount, currency)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 dark:bg-[#262626] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.percent}%`,
                      backgroundColor: b.color,
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium pt-0.5">
                  <span className="text-[#64748B] dark:text-zinc-400">Remaining</span>
                  <span
                    className={`font-bold tabular-numbers ${
                      b.isOver ? 'text-[#EF4444]' : 'text-[#10B981]'
                    }`}
                  >
                    {b.isOver ? `Over by ${formatMoney(b.spent - b.limitAmount, currency)}` : formatMoney(b.remaining, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. AI Financial Insights Section ── */}
      <div className="fintech-card p-6 bg-white dark:bg-[#121212] border border-[#E2E8F0] dark:border-[#262626] relative overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center text-sm shadow-xs">
              ✨
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white">AI Financial Insights</h2>
              <p className="text-xs text-[#64748B] dark:text-zinc-400">Continuous personalized spending intelligence</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('ai-assistant')}
            className="text-xs font-bold text-[#7C3AED] dark:text-purple-400 hover:underline flex items-center gap-1"
          >
            Open AI Assistant →
          </button>
        </div>

        {/* 3-4 Attractive FinTech Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Spending Alert */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-red-100 dark:border-[#262626] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/50 text-[#EF4444] flex items-center justify-center text-xs font-bold">
                ⚠️
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">Spending Alert</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-zinc-300 leading-relaxed">
              Your Food & Dining expenses increased by <strong className="text-[#EF4444]">18%</strong> compared to your 3-month average.
            </p>
          </div>

          {/* Card 2: Savings Opportunity */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-emerald-100 dark:border-[#262626] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#10B981] flex items-center justify-center text-xs font-bold">
                💡
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">Savings Opportunity</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-zinc-300 leading-relaxed">
              You could save approximately <strong className="text-[#10B981]">{formatMoney(1500, currency)}</strong> by reducing discretionary weekend orders.
            </p>
          </div>

          {/* Card 3: Smart Budget */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#18181B] border border-purple-100 dark:border-[#262626] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-[#7C3AED] flex items-center justify-center text-xs font-bold">
                🎯
              </span>
              <span className="text-xs font-bold text-[#0F172A] dark:text-white">Smart Budget</span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-zinc-300 leading-relaxed">
              Your optimal 50/30/20 recommended Food budget for next month is <strong className="text-[#7C3AED]">{formatMoney(7000, currency)}</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ── 6. Recent Transactions Table ── */}
      <div className="fintech-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] dark:text-white">Recent Transactions</h2>
            <p className="text-xs text-[#64748B] dark:text-zinc-400 mt-0.5">Latest account inflows and outflows</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline"
          >
            View All Transactions →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748B] dark:text-zinc-400">
            <span>💸 No recent transactions. Click "+ Add Expense" or "+ Add Income" above.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] dark:border-[#262626] text-[11px] font-bold text-[#64748B] dark:text-zinc-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Transaction</th>
                  <th className="pb-3 px-3">Category</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Payment</th>
                  <th className="pb-3 px-3 text-right">Amount</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#262626] text-xs">
                {recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[#F8FAFC] dark:hover:bg-[#18181B] transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-[#222222] flex items-center justify-center text-sm shrink-0">
                          {CATEGORY_ICONS[tx.category] || '📦'}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A] dark:text-white leading-tight">
                            {tx.description}
                          </p>
                          {tx.notes && (
                            <p className="text-[10px] text-[#64748B] dark:text-zinc-400 truncate max-w-xs mt-0.5">
                              {tx.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-100 dark:bg-[#222222] text-[#0F172A] dark:text-zinc-200">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#64748B] dark:text-zinc-400 font-medium whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-medium text-[#64748B] dark:text-zinc-400">
                        {tx.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-black tabular-numbers whitespace-nowrap ${
                        tx.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '−'} {formatMoney(tx.amount, currency)}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => setTransactionModal({ open: true, presetType: tx.type, editing: tx })}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-[#18181B] transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, transaction: tx })}
                          className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-[#18181B] transition-colors"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
