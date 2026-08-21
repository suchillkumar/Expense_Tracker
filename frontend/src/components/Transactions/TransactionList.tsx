import { useMemo, useState } from 'react'
import { useExpense } from '../../context/ExpenseContext'
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
  Investments: '📈',
  Other: '📦',
}

export function TransactionList({ limit }: TransactionListProps) {
  const { transactions, currency } = useExpense()

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

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = limit || 12

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

  const allAvailableCategories = useMemo(() => {
    return Array.from(new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]))
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Transactions
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Search, filter, and audit your personal income and expense records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('income')}
            className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>💰</span> + Add Income
          </button>
          <button
            onClick={() => handleOpenAdd('expense')}
            className="px-4 py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-sm shadow-red-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>🔴</span> + Add Expense
          </button>
        </div>
      </div>

      {/* 2. Tabs + Filter Toolbar */}
      <div className="fintech-card p-5 space-y-4">
        {/* Type Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[#E2E8F0] dark:border-slate-800 pb-4">
          <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-800 p-1 rounded-xl gap-1 border border-[#E2E8F0] dark:border-slate-700">
            <button
              onClick={() => { setTab('all'); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'all'
                  ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-blue-400 shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
            >
              All Transactions ({transactions.length})
            </button>
            <button
              onClick={() => { setTab('income'); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'income'
                  ? 'bg-white dark:bg-[#0F172A] text-[#10B981] dark:text-emerald-400 shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
            >
              Income ({transactions.filter((t) => t.type === 'income').length})
            </button>
            <button
              onClick={() => { setTab('expense'); setPage(1) }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === 'expense'
                  ? 'bg-white dark:bg-[#0F172A] text-[#EF4444] dark:text-red-400 shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A] dark:hover:text-slate-200'
              }`}
            >
              Expenses ({transactions.filter((t) => t.type === 'expense').length})
            </button>
          </div>

          {/* Active Filter Count / Reset */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#64748B] dark:text-slate-400">
              Showing {filtered.length} of {transactions.length}
            </span>
            {(search || selectedCategory !== 'all' || selectedPaymentMethod !== 'all' || dateRange !== 'all' || minAmount || maxAmount || tab !== 'all') && (
              <button
                onClick={resetFilters}
                className="text-xs font-bold text-[#2563EB] dark:text-blue-400 hover:underline px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-lg"
              >
                Clear Filters ✕
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              placeholder="Search description, notes, amount..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full px-4 py-2.5 pl-9 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-[#0F172A] dark:text-white placeholder-[#64748B] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-xs">🔍</span>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
            >
              <option value="all">All Categories</option>
              {allAvailableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => { setSelectedPaymentMethod(e.target.value); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
            >
              <option value="all">All Payments</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => { setDateRange(e.target.value as typeof dateRange); setPage(1) }}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Date</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
            >
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="highest">💰 Highest Amount</option>
              <option value="lowest">💰 Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Pickers */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs dark:bg-slate-800 text-[#0F172A] dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs dark:bg-slate-800 text-[#0F172A] dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Transaction Data Table & Mobile Cards */}
      <div className="fintech-card overflow-hidden">
        {paginatedList.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center text-2xl mx-auto mb-3">
              🔍
            </div>
            <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
              No matching transactions found
            </h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Try adjusting your search query, clearing filters, or adding a new transaction.
            </p>
            <button
              onClick={() => handleOpenAdd('expense')}
              className="mt-4 px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-all"
            >
              + Record Expense
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-[#E2E8F0] dark:border-slate-800">
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
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                  {paginatedList.map((tx) => {
                    const isIncome = tx.type === 'income'
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => setViewDetailsTx(tx)}
                      >
                        <td className="py-3.5 px-5 font-semibold text-[#64748B] dark:text-slate-400 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#0F172A] dark:text-white max-w-[240px] truncate">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">
                              {CATEGORY_ICONS[tx.category] || '📦'}
                            </span>
                            <span className="truncate">{tx.description}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border"
                            style={{
                              backgroundColor: `${categoryColor(tx.category)}15`,
                              borderColor: `${categoryColor(tx.category)}35`,
                              color: categoryColor(tx.category),
                            }}
                          >
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] dark:text-slate-400 font-medium whitespace-nowrap">
                          {tx.paymentMethod || 'Cash'}
                        </td>
                        <td className="py-3.5 px-4 text-[#64748B] dark:text-slate-400 max-w-[160px] truncate">
                          {tx.notes || '—'}
                        </td>
                        <td
                          className={`py-3.5 px-5 text-right font-black tabular-numbers whitespace-nowrap text-sm ${
                            isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'
                          }`}
                        >
                          {isIncome ? '+' : '−'} {formatMoney(tx.amount, currency)}
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              onClick={(e) => handleOpenEdit(tx, e)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => handleOpenDelete(tx, e)}
                              className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
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

            {/* Mobile Card List View */}
            <div className="sm:hidden divide-y divide-[#E2E8F0] dark:divide-slate-800">
              {paginatedList.map((tx) => {
                const isIncome = tx.type === 'income'
                return (
                  <div
                    key={tx.id}
                    onClick={() => setViewDetailsTx(tx)}
                    className="p-4 space-y-2 hover:bg-[#F8FAFC] dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
                          {CATEGORY_ICONS[tx.category] || '📦'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#0F172A] dark:text-white truncate">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-[#64748B] dark:text-slate-400 mt-0.5">
                            {formatDate(tx.date)} • {tx.paymentMethod || 'Cash'}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`text-sm font-black tabular-numbers shrink-0 ${
                          isIncome ? 'text-[#10B981]' : 'text-[#EF4444]'
                        }`}
                      >
                        {isIncome ? '+' : '−'} {formatMoney(tx.amount, currency)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                        style={{
                          backgroundColor: `${categoryColor(tx.category)}15`,
                          borderColor: `${categoryColor(tx.category)}35`,
                          color: categoryColor(tx.category),
                        }}
                      >
                        {tx.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleOpenEdit(tx, e)}
                          className="text-xs text-[#2563EB] font-bold p-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(tx, e)}
                          className="text-xs text-[#EF4444] font-bold p-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-[#E2E8F0] dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/40 text-xs">
                <span className="text-[#64748B] dark:text-slate-400 font-semibold">
                  Page {page} of {totalPages} ({filtered.length} total)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-bold disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white font-bold disabled:opacity-40 hover:bg-[#F8FAFC]"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {viewDetailsTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-md w-full border border-[#E2E8F0] dark:border-slate-800 shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{CATEGORY_ICONS[viewDetailsTx.category] || '📦'}</span>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Transaction Details</h3>
              </div>
              <button
                onClick={() => setViewDetailsTx(null)}
                className="text-sm font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Description</span>
                <span className="font-bold text-[#0F172A] dark:text-white">{viewDetailsTx.description}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Amount</span>
                <span
                  className={`font-black tabular-numbers text-sm ${
                    viewDetailsTx.type === 'income' ? 'text-[#10B981]' : 'text-[#EF4444]'
                  }`}
                >
                  {viewDetailsTx.type === 'income' ? '+' : '−'} {formatMoney(viewDetailsTx.amount, currency)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Type</span>
                <span className="capitalize font-bold text-[#0F172A] dark:text-white">{viewDetailsTx.type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Category</span>
                <span className="font-bold text-[#0F172A] dark:text-white">{viewDetailsTx.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Date</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">{formatDate(viewDetailsTx.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50 dark:border-slate-800/60">
                <span className="text-[#64748B]">Payment Method</span>
                <span className="font-semibold text-[#0F172A] dark:text-white">{viewDetailsTx.paymentMethod || 'Cash'}</span>
              </div>
              {viewDetailsTx.notes && (
                <div className="py-1">
                  <span className="text-[#64748B] block mb-1">Notes</span>
                  <p className="p-3 bg-[#F8FAFC] dark:bg-slate-800 rounded-xl text-[#0F172A] dark:text-slate-200">
                    {viewDetailsTx.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
              <button
                onClick={() => {
                  const tx = viewDetailsTx
                  setViewDetailsTx(null)
                  setPresetType(tx.type)
                  setEditingTx(tx)
                  setFormOpen(true)
                }}
                className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-bold hover:bg-blue-700 transition-all"
              >
                Edit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Add/Edit Form Modal */}
      {formOpen && (
        <TransactionForm
          initial={editingTx}
          presetType={presetType}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTx && (
        <DeleteTransactionModal
          transaction={deletingTx}
          onClose={() => setDeletingTx(null)}
        />
      )}
    </div>
  )
}
