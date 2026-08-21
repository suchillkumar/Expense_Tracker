import { useState, useMemo } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { formatMoney } from '../../services/currencyService'
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
  Legend
} from 'recharts'

type TimeFilter = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'custom'

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
  Other: '#64748B',
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
  Other: '📦',
}

export function AnalyticsView() {
  const { transactions, currency } = useExpense()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('last_6_months')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const now = new Date()

  // Filtered transactions based on time range
  const filteredTxs = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date)
      if (timeFilter === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      if (timeFilter === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear()
      }
      if (timeFilter === 'last_3_months') {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        return d >= threeMonthsAgo
      }
      if (timeFilter === 'last_6_months') {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)
        return d >= sixMonthsAgo
      }
      if (timeFilter === 'this_year') {
        return d.getFullYear() === now.getFullYear()
      }
      if (timeFilter === 'custom') {
        if (customFrom && d < new Date(customFrom)) return false
        if (customTo && d > new Date(customTo + 'T23:59:59')) return false
        return true
      }
      return true
    })
  }, [transactions, timeFilter, customFrom, customTo])

  // Total Income, Expense, Net Savings
  const totalIncome = useMemo(
    () => filteredTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [filteredTxs]
  )
  const totalExpense = useMemo(
    () => filteredTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [filteredTxs]
  )
  const netSavings = Math.max(0, totalIncome - totalExpense)
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0
  const avgExpensePerTx = useMemo(() => {
    const expenses = filteredTxs.filter((t) => t.type === 'expense')
    return expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0
  }, [filteredTxs, totalExpense])

  // Monthly Cash Flow Data
  const monthlyData = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString([], { month: 'short', year: '2-digit' })
      map[key] = { income: 0, expense: 0 }
    }

    filteredTxs.forEach((t) => {
      const d = new Date(t.date)
      const key = d.toLocaleDateString([], { month: 'short', year: '2-digit' })
      if (map[key]) {
        if (t.type === 'income') map[key].income += t.amount
        else map[key].expense += t.amount
      }
    })

    return Object.entries(map).map(([month, val]) => ({
      month,
      income: val.income,
      expense: val.expense,
      savings: Math.max(0, val.income - val.expense),
    }))
  }, [filteredTxs])

  // Category Donut Data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {}
    filteredTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })

    const total = Object.values(map).reduce((a, b) => a + b, 0)
    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percent: total > 0 ? Math.round((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTxs])

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header & Time Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F8FAFC]">
            Financial Analytics
          </h2>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
            Deep dive into your cash flows, category spending velocity, and savings progress.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap bg-slate-100 dark:bg-[#243244] p-1.5 rounded-xl gap-1 border border-[#E2E8F0] dark:border-[#334155]">
          {[
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
            { key: 'last_3_months', label: 'Last 3M' },
            { key: 'last_6_months', label: 'Last 6M' },
            { key: 'this_year', label: 'This Year' },
            { key: 'custom', label: 'Custom' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setTimeFilter(f.key as TimeFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timeFilter === f.key
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Pickers */}
      {timeFilter === 'custom' && (
        <div className="fintech-card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            <span>From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-sm bg-white dark:bg-[#243244] text-[#1E293B] dark:text-[#F8FAFC] font-normal"
            />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">
            <span>To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-sm bg-white dark:bg-[#243244] text-[#1E293B] dark:text-[#F8FAFC] font-normal"
            />
          </div>
        </div>
      )}

      {/* 2. Executive Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-5 border-t-3 border-t-[#2563EB] dark:border-t-[#3B82F6]">
          <p className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Total Income</p>
          <p className="text-2xl font-semibold text-[#2563EB] dark:text-[#3B82F6] mt-1.5 tabular-numbers">
            {formatMoney(totalIncome, currency)}
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">Inflow across period</p>
        </div>

        <div className="fintech-card p-5 border-t-3 border-t-[#DC2626] dark:border-t-[#F87171]">
          <p className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Total Expenses</p>
          <p className="text-2xl font-semibold text-[#DC2626] dark:text-[#F87171] mt-1.5 tabular-numbers">
            {formatMoney(totalExpense, currency)}
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">Outflow across period</p>
        </div>

        <div className="fintech-card p-5 border-t-3 border-t-[#16A34A] dark:border-t-[#22C55E]">
          <p className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Net Savings</p>
          <p className="text-2xl font-semibold text-[#16A34A] dark:text-[#22C55E] mt-1.5 tabular-numbers">
            {formatMoney(netSavings, currency)}
          </p>
          <p className="text-xs text-[#16A34A] dark:text-[#22C55E] font-medium mt-1">
            Savings Rate: {savingsRate}%
          </p>
        </div>

        <div className="fintech-card p-5 border-t-3 border-t-[#7C3AED] dark:border-t-[#A78BFA]">
          <p className="text-sm font-medium text-[#64748B] dark:text-[#94A3B8]">Avg Spend / Transaction</p>
          <p className="text-2xl font-semibold text-[#1E293B] dark:text-[#F8FAFC] mt-1.5 tabular-numbers">
            {formatMoney(avgExpensePerTx, currency)}
          </p>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">{filteredTxs.length} Total records</p>
        </div>
      </div>

      {/* 3. Charts: Cashflow Trend & Category Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Trend Bar Chart */}
        <div className="lg:col-span-2 fintech-card p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
              Income vs Expenses vs Savings
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Historical cash flow comparison</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: any) => formatMoney(Number(val) || 0, currency)}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Donut */}
        <div className="fintech-card p-6 flex flex-col justify-between">
          <div className="mb-2">
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Category Distribution</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">Share of total expenditures</p>
          </div>

          {categoryData.length === 0 ? (
            <div className="py-20 text-center text-xs text-[#64748B] dark:text-slate-400">
              <span>🍩 No expense records found in this time range.</span>
            </div>
          ) : (
            <>
              <div className="h-48 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry) => (
                        <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#64748B'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatMoney(Number(val) || 0, currency)}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 max-h-36 overflow-y-auto pr-1">
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
                    <div className="flex items-center gap-2">
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
