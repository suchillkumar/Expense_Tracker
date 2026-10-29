import { useState, useMemo, useEffect } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney, getSymbol } from '../../services/currencyService'

export interface SavingsGoal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  categoryIcon: string
  color: string
  notes?: string
  completed?: boolean
}

const DEFAULT_GOALS: SavingsGoal[] = [
  {
    id: 'goal-1',
    title: 'Emergency Safety Net',
    targetAmount: 150000,
    currentAmount: 105000,
    targetDate: '2026-12-31',
    categoryIcon: '🛡️',
    color: '#10B981',
    notes: '6 months of living expenses reserve',
  },
  {
    id: 'goal-2',
    title: 'MacBook Pro M-Series',
    targetAmount: 180000,
    currentAmount: 135000,
    targetDate: '2026-11-30',
    categoryIcon: '💻',
    color: '#3B82F6',
    notes: 'Work workstation upgrade',
  },
  {
    id: 'goal-3',
    title: 'Annual Vacation Trip',
    targetAmount: 80000,
    currentAmount: 52000,
    targetDate: '2027-02-15',
    categoryIcon: '✈️',
    color: '#8B5CF6',
    notes: 'Mountain retreat holiday',
  },
  {
    id: 'goal-4',
    title: 'Mutual Fund SIP Accelerator',
    targetAmount: 100000,
    currentAmount: 100000,
    targetDate: '2026-10-01',
    categoryIcon: '📈',
    color: '#EC4899',
    notes: 'Achieved target for index funds portfolio',
    completed: true,
  },
]

const GOAL_ICONS = ['🛡️', '💻', '✈️', '📈', '🚗', '🏡', '💍', '🎓', '🎁', '⚡']

export function GoalsView() {
  const { currency } = useExpense()
  const toast = useToast()

  const [goals, setGoals] = useState<SavingsGoal[]>(() => {
    try {
      const saved = localStorage.getItem('spendwise_savings_goals')
      return saved ? JSON.parse(saved) : DEFAULT_GOALS
    } catch {
      return DEFAULT_GOALS
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('spendwise_savings_goals', JSON.stringify(goals))
    } catch {
      /* ignore */
    }
  }, [goals])

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)
  const [contributionModal, setContributionModal] = useState<{ open: boolean; goal: SavingsGoal | null }>({
    open: false,
    goal: null,
  })

  // Form Fields
  const [title, setTitle] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [categoryIcon, setCategoryIcon] = useState('🎯')
  const [notes, setNotes] = useState('')
  const [contributionAmount, setContributionAmount] = useState('')

  // Summary Metrics
  const summary = useMemo(() => {
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0)
    const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0)
    const remaining = Math.max(0, totalTarget - totalSaved)
    const completedCount = goals.filter((g) => g.currentAmount >= g.targetAmount || g.completed).length
    const overallPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0
    return { totalTarget, totalSaved, remaining, completedCount, overallPct }
  }, [goals])

  const openCreate = () => {
    setEditingGoal(null)
    setTitle('')
    setTargetAmount('')
    setCurrentAmount('0')
    setTargetDate(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0])
    setCategoryIcon('🎯')
    setNotes('')
    setCreateModalOpen(true)
  }

  const openEdit = (g: SavingsGoal) => {
    setEditingGoal(g)
    setTitle(g.title)
    setTargetAmount(String(g.targetAmount))
    setCurrentAmount(String(g.currentAmount))
    setTargetDate(g.targetDate)
    setCategoryIcon(g.categoryIcon)
    setNotes(g.notes || '')
    setCreateModalOpen(true)
  }

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseFloat(targetAmount)
    const current = parseFloat(currentAmount) || 0
    if (!title.trim()) {
      toast.error('Please enter a goal title')
      return
    }
    if (isNaN(target) || target <= 0) {
      toast.error('Please enter a valid target amount')
      return
    }

    if (editingGoal) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === editingGoal.id
            ? {
                ...g,
                title: title.trim(),
                targetAmount: target,
                currentAmount: current,
                targetDate,
                categoryIcon,
                notes: notes.trim(),
                completed: current >= target,
              }
            : g
        )
      )
      toast.success('Savings goal updated successfully!')
    } else {
      const newGoal: SavingsGoal = {
        id: 'goal-' + Date.now(),
        title: title.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        categoryIcon,
        color: '#10B981',
        notes: notes.trim(),
        completed: current >= target,
      }
      setGoals((prev) => [newGoal, ...prev])
      toast.success('New savings goal created!')
    }
    setCreateModalOpen(false)
  }

  const handleDeleteGoal = (id: string) => {
    if (confirm('Are you sure you want to delete this savings goal?')) {
      setGoals((prev) => prev.filter((g) => g.id !== id))
      toast.info('Goal removed')
    }
  }

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault()
    const addAmt = parseFloat(contributionAmount)
    if (isNaN(addAmt) || addAmt <= 0) {
      toast.error('Please enter a valid contribution amount')
      return
    }
    if (!contributionModal.goal) return

    setGoals((prev) =>
      prev.map((g) => {
        if (g.id === contributionModal.goal?.id) {
          const newCurrent = g.currentAmount + addAmt
          return {
            ...g,
            currentAmount: newCurrent,
            completed: newCurrent >= g.targetAmount,
          }
        }
        return g
      })
    )
    toast.success(`Contributed ${formatMoney(addAmt, currency)} to ${contributionModal.goal.title}!`)
    setContributionModal({ open: false, goal: null })
    setContributionAmount('')
  }

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-1">
            <span>🎯</span> Wealth & Milestone Planning
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Savings Goals
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track milestone progress, add deposits, and forecast completion dates.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all active:scale-95 self-start sm:self-auto cursor-pointer"
        >
          <span>+</span>
          <span>Create New Goal</span>
        </button>
      </div>

      {/* ── Summary Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="fintech-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Saved</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2 tabular-numbers">
            {formatMoney(summary.totalSaved, currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{summary.overallPct}% of all targets reached</p>
        </div>

        <div className="fintech-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Goal Targets</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-numbers">
            {formatMoney(summary.totalTarget, currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{goals.length} total active objectives</p>
        </div>

        <div className="fintech-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Remaining to Save</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-numbers">
            {formatMoney(summary.remaining, currency)}
          </p>
          <p className="text-xs text-slate-400 mt-1">To achieve 100% completion</p>
        </div>

        <div className="fintech-card p-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Goals Achieved</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2 tabular-numbers">
            {summary.completedCount} / {goals.length}
          </p>
          <p className="text-xs text-slate-400 mt-1">Milestones fully unlocked 🎉</p>
        </div>
      </div>

      {/* ── Goals Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
          const remaining = Math.max(0, g.targetAmount - g.currentAmount)
          const isDone = pct >= 100 || g.completed

          // Days remaining calculation
          const targetD = new Date(g.targetDate)
          const nowD = new Date()
          const diffDays = Math.ceil((targetD.getTime() - nowD.getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div
              key={g.id}
              className={`fintech-card p-5 relative overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg ${
                isDone ? 'border-emerald-500/50 dark:border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10' : ''
              }`}
            >
              {/* Status Header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shrink-0 shadow-xs">
                      {g.categoryIcon || '🎯'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {g.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target: {new Date(g.targetDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {isDone ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓</span> Done
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      {diffDays > 0 ? `${diffDays} days left` : 'Due today'}
                    </span>
                  )}
                </div>

                {g.notes && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-[11px]">
                    {g.notes}
                  </p>
                )}

                {/* Progress Bar & Amount */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-white text-base tabular-numbers">
                      {formatMoney(g.currentAmount, currency)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium tabular-numbers">
                      of {formatMoney(g.targetAmount, currency)} ({pct}%)
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                    <span>{isDone ? '🎉 Goal Completed!' : `${formatMoney(remaining, currency)} remaining`}</span>
                    <span>{pct}% Achieved</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => setContributionModal({ open: true, goal: g })}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <span>💰</span>
                  <span>+ Deposit</span>
                </button>

                <button
                  onClick={() => openEdit(g)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Edit Goal"
                >
                  ✏️
                </button>

                <button
                  onClick={() => handleDeleteGoal(g.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  title="Delete Goal"
                >
                  🗑️
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Create / Edit Goal Modal ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Savings Goal' : 'Create New Savings Goal'}
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Home Downpayment, Laptop Upgrade"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Amount ({getSymbol(currency)}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 50000"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Already Saved
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Completion Date *
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Choose Milestone Icon
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {GOAL_ICONS.map((ic) => (
                    <button
                      type="button"
                      key={ic}
                      onClick={() => setCategoryIcon(ic)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-base border transition-all ${
                        categoryIcon === ic
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 scale-105'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes or Motivation (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Save ₹5,000 monthly from salary"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {editingGoal ? 'Update Goal' : 'Save Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Contribution Modal ── */}
      {contributionModal.open && contributionModal.goal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{contributionModal.goal.categoryIcon}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add Deposit
                </h3>
                <p className="text-xs text-slate-500">{contributionModal.goal.title}</p>
              </div>
            </div>

            <form onSubmit={handleAddContribution} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deposit Amount ({getSymbol(currency)})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  placeholder="e.g. 2500"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setContributionModal({ open: false, goal: null })}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
