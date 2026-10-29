import { useMemo, useState } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../services/currencyService'
import { Transaction, EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, TransactionType } from '../../types'
import { categoryColor, formatDate } from '../../utils/format'
import { TransactionForm } from './TransactionForm'
import { DeleteTransactionModal } from './DeleteTransactionModal'

interface TransactionListProps {
  limit?: number
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
  Investment: '📈',
  Investments: '📈',
  Gift: '🎁',
  Other: '📦',
}

export function TransactionList({ limit }: TransactionListProps) {
  const { transactions, currency } = useExpense()
  const toast = useToast()

  // Tab & Filters
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all')
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year' | 'custom'>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [groupByDay, setGroupByDay] = useState(true)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = limit || 15

  // Modals
  const [formOpen, setFormOpen] = useState(false)
  const [presetType, setPresetType] = useState<TransactionType>('expense')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null)
  const [viewDetailsTx, setViewDetailsTx] = useState<Transaction | null>(null)

  // Filter & Search Logic
  const filtered = useMemo(() => {
    let list = [...transactions]

    // Tab Type filter
    if (tab !== 'all') {
      list = list.filter((t) => t.type === tab)
    }

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory)
    }

    // Payment method filter
    if (selectedPaymentMethod !== 'all') {
      list = list.filter((t) => (t.paymentMethod || 'Cash') === selectedPaymentMethod)
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date()
      if (dateRange === 'today') {
        const todayStr = now.toISOString().split('T')[0]
        list = list.filter((t) => t.date.startsWith(todayStr))
      } else if (dateRange === 'week') {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(now.getDate() - 7)
        list = list.filter((t) => new Date(t.date) >= sevenDaysAgo)
      } else if (dateRange === 'month') {
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        list = list.filter((t) => t.date.substring(0, 7) === ym)
      } else if (dateRange === 'year') {
        const y = String(now.getFullYear())
        list = list.filter((t) => t.date.startsWith(y))
      } else if (dateRange === 'custom') {
        if (customFrom) {
          list = list.filter((t) => new Date(t.date) >= new Date(customFrom))
        }
        if (customTo) {
          list = list.filter((t) => new Date(t.date) <= new Date(customTo + 'T23:59:59'))
        }
      }
    }

    // Amount range filter
    if (minAmount) {
      const min = parseFloat(minAmount)
      if (!isNaN(min)) list = list.filter((t) => t.amount >= min)
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount)
      if (!isNaN(max)) list = list.filter((t) => t.amount <= max)
    }

    // Keyword search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.amount.toString().includes(q)
      )
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === 'highest') return b.amount - a.amount
      if (sortBy === 'lowest') return a.amount - b.amount
      return 0
    })

    return list
  }, [transactions, tab, selectedCategory, selectedPaymentMethod, dateRange, customFrom, customTo, minAmount, maxAmount, search, sortBy])

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / pageSize) || 1
  const paginatedList = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  // Grouped by Day (for active page items)
  const groupedList = useMemo(() => {
    if (!groupByDay) return []
    const groups: {
      dateKey: string
      dateLabel: string
      totalExpense: number
      totalIncome: number
      items: Transaction[]
    }[] = []

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    paginatedList.forEach((tx) => {
      const dateKey = tx.date.split('T')[0]
      let group = groups.find((g) => g.dateKey === dateKey)

      if (!group) {
        let dateLabel = formatDate(tx.date)
        if (dateKey === todayStr) {
          dateLabel = 'Today'
        } else if (dateKey === yesterdayStr) {
          dateLabel = 'Yesterday'
        }

        group = {
          dateKey,
          dateLabel,
          totalExpense: 0,
          totalIncome: 0,
          items: [],
        }
        groups.push(group)
      }

      group.items.push(tx)
      if (tx.type === 'expense') group.totalExpense += tx.amount
      else group.totalIncome += tx.amount
    })

    return groups
  }, [paginatedList, groupByDay])

  // Aggregate stats of filtered results
  const summaryStats = useMemo(() => {
    let inc = 0
    let exp = 0
    filtered.forEach((t) => {
      if (t.type === 'income') inc += t.amount
      else exp += t.amount
    })
    return { income: inc, expense: exp, net: inc - exp }
  }, [filtered])

  const handleOpenAdd = (type: TransactionType) => {
    setPresetType(type)
    setEditingTx(null)
    setFormOpen(true)
  }

  const handleOpenEdit = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation()
    setPresetType(tx.type)
    setEditingTx(tx)
    setFormOpen(true)
  }

  const handleOpenDelete = (tx: Transaction, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingTx(tx)
  }

  const resetFilters = () => {
    setTab('all')
    setSearch('')
    setSelectedCategory('all')
    setSelectedPaymentMethod('all')
    setDateRange('all')
    setCustomFrom('')
    setCustomTo('')
    setMinAmount('')
    setMaxAmount('')
    setSortBy('newest')
    setPage(1)
  }

  // Instant CSV Export of current filtered dataset
  const exportFilteredCSV = () => {
    if (filtered.length === 0) {
      toast.error('No transactions to export.')
      return
    }
    const headers = ['ID', 'Date', 'Type', 'Category', 'Description', 'Amount', 'Currency', 'Payment Method', 'Notes']
    const rows = filtered.map((t) => [
      `"${t.id}"`,
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.category}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${currency}"`,
      `"${t.paymentMethod || 'Cash'}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Filtered transactions exported to CSV!')
  }

  const allAvailableCategories = useMemo(() => {
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]))
  }, [])

  const hasActiveFilters =
    search ||
    selectedCategory !== 'all' ||
    selectedPaymentMethod !== 'all' ||
    dateRange !== 'all' ||
    minAmount ||
    maxAmount ||
    tab !== 'all'

  return (
    <div className="space-y-5 animate-fade-in pb-16">
      {/* 1. Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Transaction Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Search, filter, categorize, and audit your complete financial history.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportFilteredCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
            title="Export filtered records to CSV"
          >
            <span>📥</span> Export CSV
          </button>
          <button
            onClick={() => handleOpenAdd('income')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>+</span> Income
          </button>
          <button
            onClick={() => handleOpenAdd('expense')}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
          >
            <span>+</span> Expense
          </button>
        </div>
      </div>

      {/* 2. Overview Ribbon of Filtered Set */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="fintech-card p-3 sm:p-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">Total Filtered</p>
          <p className="text-sm sm:text-lg font-black text-slate-900 dark:text-white mt-0.5 tabular-numbers">
            {filtered.length} <span className="text-[11px] font-normal text-slate-400 hidden sm:inline">records</span>
          </p>
        </div>
        <div className="fintech-card p-3 sm:p-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-500">Total Inflow</p>
          <p className="text-sm sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-numbers">
            +{formatMoney(summaryStats.income, currency)}
          </p>
        </div>
        <div className="fintech-card p-3 sm:p-4 text-center sm:text-left">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500">Total Outflow</p>
          <p className="text-sm sm:text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 tabular-numbers">
            -{formatMoney(summaryStats.expense, currency)}
          </p>
        </div>
      </div>

      {/* 3. Search Bar & Filter Controls */}
      <div className="fintech-card p-4 sm:p-5 space-y-4">
        {/* Type Tabs & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* All / Income / Expense Pills */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              onClick={() => { setTab('all'); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => { setTab('income'); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Income ({transactions.filter((t) => t.type === 'income').length})
            </button>
            <button
              onClick={() => { setTab('expense'); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Expense ({transactions.filter((t) => t.type === 'expense').length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Group by Day toggle */}
            <button
              type="button"
              onClick={() => setGroupByDay(!groupByDay)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                groupByDay
                  ? 'border-blue-500/40 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span>📅</span> Group by Day
            </button>

            {/* Clear filters badge */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-900/60"
              >
                Clear Filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              placeholder="Search title, category, notes, amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full px-4 py-2.5 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="all">All Categories</option>
              {allAvailableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Dropdown */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => { setSelectedPaymentMethod(e.target.value); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="all">All Payment Methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value as typeof dateRange); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="newest">📅 Newest Date</option>
              <option value="oldest">📅 Oldest Date</option>
              <option value="highest">💰 Highest Amount</option>
              <option value="lowest">💰 Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Selectors */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. Transaction List View */}
      <div className="fintech-card overflow-hidden">
        {paginatedList.length === 0 ? (
          <div className="py-16 px-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No matching transactions found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              We couldn't find any entries matching your current filters. Try resetting filters or recording a new transaction.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={() => handleOpenAdd('expense')}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                + Record Expense
              </button>
            </div>
          </div>
        ) : groupByDay ? (
          /* GROUPED BY DAY VIEW */
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {groupedList.map((group) => {
              const dayNet = group.totalIncome - group.totalExpense
              return (
                <div key={group.dateKey} className="space-y-1">
                  {/* Group Header */}
                  <div className="px-5 py-3 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {group.dateLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({group.items.length} {group.items.length === 1 ? 'record' : 'records'})
                      </span>
                    </div>
                    <div className="text-xs font-bold tabular-numbers flex items-center gap-2">
                      {group.totalExpense > 0 && (
                        <span className="text-rose-600 dark:text-rose-400">
                          Spent: -{formatMoney(group.totalExpense, currency)}
                        </span>
                      )}
                      {group.totalIncome > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Earned: +{formatMoney(group.totalIncome, currency)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                          dayNet >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}
                      >
                        Net: {dayNet >= 0 ? '+' : ''}{formatMoney(dayNet, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Items in this Day */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {group.items.map((tx) => {
                      const isIncome = tx.type === 'income'
                      return (
                        <div
                          key={tx.id}
                          onClick={() => setViewDetailsTx(tx)}
                          className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                              {CATEGORY_ICONS[tx.category] || '📦'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                {tx.description}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                                  style={{
                                    backgroundColor: `${categoryColor(tx.category)}15`,
                                    borderColor: `${categoryColor(tx.category)}30`,
                                    color: categoryColor(tx.category),
                                  }}
                                >
                                  {tx.category}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {tx.paymentMethod || 'Cash'}
                                </span>
                                {tx.notes && (
                                  <span className="text-[11px] text-slate-400 truncate max-w-[120px] hidden sm:inline">
                                    • {tx.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p
                                className={`text-xs sm:text-sm font-black tabular-numbers ${
                                  isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {isIncome ? '+' : '−'} {formatMoney(tx.amount, currency)}
                              </p>
                              <p className="text-[10px] text-slate-400 capitalize">
                                {tx.type}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleOpenEdit(tx, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={(e) => handleOpenDelete(tx, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* STANDARD DESKTOP TABLE VIEW */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4">Notes</th>
                  <th className="py-3.5 px-5 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedList.map((tx) => {
                  const isIncome = tx.type === 'income'
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setViewDetailsTx(tx)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-500 whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white max-w-[220px] truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{CATEGORY_ICONS[tx.category] || '📦'}</span>
                          <span className="truncate">{tx.description}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                          style={{
                            backgroundColor: `${categoryColor(tx.category)}15`,
                            borderColor: `${categoryColor(tx.category)}35`,
                            color: categoryColor(tx.category),
                          }}
                        >
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium">
                        {tx.paymentMethod || 'Cash'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 max-w-[150px] truncate font-medium">
                        {tx.notes || '—'}
                      </td>
                      <td
                        className={`py-3.5 px-5 text-right font-black tabular-numbers whitespace-nowrap ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '−'} {formatMoney(tx.amount, currency)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleOpenEdit(tx, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => handleOpenDelete(tx, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold">
            <span className="text-slate-500 dark:text-slate-400">
              Page {page} of {totalPages} ({filtered.length} total)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Detail Modal */}
      {viewDetailsTx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{CATEGORY_ICONS[viewDetailsTx.category] || '📦'}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Details</h3>
                  <p className="text-[11px] text-slate-400">ID: {viewDetailsTx.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailsTx(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Title</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewDetailsTx.description}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Amount</span>
                <span
                  className={`font-black tabular-numbers text-sm ${
                    viewDetailsTx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {viewDetailsTx.type === 'income' ? '+' : '−'} {formatMoney(viewDetailsTx.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Type</span>
                <span className="capitalize font-bold text-slate-900 dark:text-white">{viewDetailsTx.type}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Category</span>
                <span className="font-bold text-slate-900 dark:text-white">{viewDetailsTx.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Date & Time</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(viewDetailsTx.date)} {viewDetailsTx.date.includes('T') ? viewDetailsTx.date.split('T')[1].slice(0, 5) : ''}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Payment Method</span>
                <span className="font-semibold text-slate-900 dark:text-white">{viewDetailsTx.paymentMethod || 'Cash'}</span>
              </div>
              {viewDetailsTx.notes && (
                <div className="py-2">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Notes</span>
                  <p className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800">
                    {viewDetailsTx.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  const tx = viewDetailsTx
                  setViewDetailsTx(null)
                  setPresetType(tx.type)
                  setEditingTx(tx)
                  setFormOpen(true)
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Edit Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <TransactionForm
          initial={editingTx}
          presetType={presetType}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Delete Modal */}
      {deletingTx && (
        <DeleteTransactionModal
          transaction={deletingTx}
          onClose={() => setDeletingTx(null)}
        />
      )}
    </div>
  )
}
