import { useState, useMemo } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../services/currencyService'
import { api } from '../../services/api'
import { Budget, BudgetRecommendation, EXPENSE_CATEGORIES } from '../../types'

const CATEGORY_ICONS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Bills: '⚡',
  Entertainment: '🎬',
  Education: '📚',
  Healthcare: '💊',
  Travel: '✈️',
  Other: '📦',
}

export function BudgetsView() {
  const { user } = useAuth()
  const { budgets, transactions, saveBudget, deleteBudget, currency } = useExpense()
  const toast = useToast()

  const [activeMonth, setActiveMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0])
  const [limitAmount, setLimitAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // AI Recommendation State
  const [aiLoading, setAiLoading] = useState(false)
  const [aiBudget, setAiBudget] = useState<BudgetRecommendation | null>(null)
  const [activeTab, setActiveTab] = useState<'monthly' | 'ai_recommendation' | 'yearly'>('monthly')

  // Calculate actual spent amounts for the selected month
  const monthTransactions = useMemo(() => {
    return transactions.filter(
      (t) => t.type === 'expense' && t.date.slice(0, 7) === activeMonth
    )
  }, [transactions, activeMonth])

  const categorySpendingMap = useMemo(() => {
    const map: Record<string, number> = {}
    monthTransactions.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return map
  }, [monthTransactions])

  // Month budgets enriched with real-time spending
  const currentMonthBudgets = useMemo(() => {
    return budgets
      .filter((b) => b.month === activeMonth)
      .map((b) => {
        const spent = categorySpendingMap[b.category] || 0
        const limit = b.limitAmount || 1
        const pct = Math.round((spent / limit) * 100)
        const remaining = Math.max(0, limit - spent)
        let status: 'safe' | 'warning' | 'near_limit' | 'exceeded' = 'safe'

        if (spent > limit) status = 'exceeded'
        else if (pct >= 90) status = 'near_limit'
        else if (pct >= 70) status = 'warning'

        return {
          ...b,
          spentAmount: spent,
          percentage: pct,
          remainingAmount: remaining,
          status,
        }
      })
  }, [budgets, categorySpendingMap, activeMonth])

  // Aggregate stats
  const totalBudgeted = useMemo(
    () => currentMonthBudgets.reduce((sum, b) => sum + b.limitAmount, 0),
    [currentMonthBudgets]
  )
  const totalSpent = useMemo(
    () => currentMonthBudgets.reduce((sum, b) => sum + b.spentAmount, 0),
    [currentMonthBudgets]
  )
  const totalRemaining = Math.max(0, totalBudgeted - totalSpent)
  const overallUtilization = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // Create / Edit Modal handlers
  const handleOpenCreate = () => {
    setEditingBudget(null)
    setCategory(EXPENSE_CATEGORIES[0])
    setLimitAmount('')
    setModalOpen(true)
  }

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b)
    setCategory(b.category)
    setLimitAmount(b.limitAmount.toString())
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const limit = parseFloat(limitAmount)
    if (isNaN(limit) || limit <= 0) {
      toast.error('Please enter a valid positive budget amount.')
      return
    }

    setSaving(true)
    try {
      await saveBudget({
        id: editingBudget?.id || crypto.randomUUID(),
        category,
        limitAmount: limit,
        spentAmount: categorySpendingMap[category] || 0,
        month: activeMonth,
        alertThreshold: 80,
      })
      toast.success(editingBudget ? 'Budget updated!' : 'Budget created successfully!')
      setModalOpen(false)
    } catch {
      toast.error('Failed to save budget.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id)
      toast.success('Budget deleted.')
      setDeletingId(null)
    } catch {
      toast.error('Failed to delete budget.')
    }
  }

  // AI 50/30/20 Generation Trigger
  const handleGenerateAIBudget = async () => {
    setAiLoading(true)
    try {
      const incomeVal = user?.monthlyIncome || 60000
      const res = await api.generateAIBudget({
        monthlyIncome: incomeVal,
        age: user?.age || 28,
        existingExpenses: totalSpent,
        financialGoal: user?.financialGoal || 'Emergency fund & saving',
      })
      setAiBudget(res)
      toast.success('AI 50/30/20 Budget Plan generated!')
    } catch {
      toast.error('Could not generate AI budget recommendations.')
    } finally {
      setAiLoading(false)
    }
  }

  // 1-Click Apply AI Recommendations to Real Budgets
  const handleApplyAIBudgets = async () => {
    if (!aiBudget?.categoryBudgets) return
    setAiLoading(true)
    try {
      for (const rec of aiBudget.categoryBudgets) {
        await saveBudget({
          id: crypto.randomUUID(),
          category: rec.category,
          limitAmount: rec.recommendedAmount,
          spentAmount: categorySpendingMap[rec.category] || 0,
          month: activeMonth,
          alertThreshold: 80,
        })
      }
      toast.success('AI Budgets applied successfully to this month!')
      setActiveTab('monthly')
    } catch {
      toast.error('Failed to apply AI budgets.')
    } finally {
      setAiLoading(false)
    }
  }

  const barColors = {
    safe: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    near_limit: 'bg-[#F59E0B]',
    exceeded: 'bg-[#EF4444]',
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Budgets & Limits
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Plan category limits, track live utilization, and generate AI budget allocations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Selector */}
          <input
            type="month"
            value={activeMonth}
            onChange={(e) => setActiveMonth(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-[#0F172A] dark:text-white shadow-xs focus:outline-none"
          />

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>+</span> Create Budget
          </button>
        </div>
      </div>

      {/* 2. Top Tabs: Monthly Tracker vs AI 50/30/20 vs Yearly Planner */}
      <div className="flex items-center bg-[#F8FAFC] dark:bg-slate-800 p-1.5 rounded-xl gap-1 max-w-md border border-[#E2E8F0] dark:border-slate-700">
        <button
          onClick={() => setActiveTab('monthly')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'monthly'
              ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-blue-400 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400'
          }`}
        >
          Monthly Tracker
        </button>
        <button
          onClick={() => {
            setActiveTab('ai_recommendation')
            if (!aiBudget) handleGenerateAIBudget()
          }}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'ai_recommendation'
              ? 'bg-white dark:bg-[#0F172A] text-[#7C3AED] dark:text-purple-400 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400'
          }`}
        >
          <span>✨</span> AI 50/30/20
        </button>
        <button
          onClick={() => setActiveTab('yearly')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'yearly'
              ? 'bg-white dark:bg-[#0F172A] text-[#2563EB] dark:text-blue-400 shadow-xs'
              : 'text-[#64748B] hover:text-[#0F172A] dark:text-slate-400'
          }`}
        >
          Yearly Planner
        </button>
      </div>

      {/* ── TAB 1: MONTHLY BUDGET TRACKER ── */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="fintech-card p-5 border-t-3 border-t-[#2563EB]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Total Budget Limit</p>
              <p className="text-2xl font-black text-[#0F172A] dark:text-white mt-1.5 tabular-numbers">
                {formatMoney(totalBudgeted, currency)}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">{currentMonthBudgets.length} Categories Active</p>
            </div>

            <div className="fintech-card p-5 border-t-3 border-t-[#EF4444]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Total Spent so Far</p>
              <p className="text-2xl font-black text-[#EF4444] mt-1.5 tabular-numbers">
                {formatMoney(totalSpent, currency)}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">{overallUtilization}% Utilized</p>
            </div>

            <div className="fintech-card p-5 border-t-3 border-t-[#10B981]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Remaining Buffer</p>
              <p className="text-2xl font-black text-[#10B981] mt-1.5 tabular-numbers">
                {formatMoney(totalRemaining, currency)}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-slate-400 mt-1">Available to spend</p>
            </div>

            <div className="fintech-card p-5 border-t-3 border-t-[#7C3AED]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase tracking-wider">Health Status</p>
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                    overallUtilization >= 100
                      ? 'bg-red-100 text-[#EF4444] dark:bg-red-950/60'
                      : overallUtilization >= 80
                      ? 'bg-amber-100 text-[#F59E0B] dark:bg-amber-950/60'
                      : 'bg-emerald-100 text-[#10B981] dark:bg-emerald-950/60'
                  }`}
                >
                  {overallUtilization >= 100
                    ? '⚠️ Over Budget'
                    : overallUtilization >= 80
                    ? '⚡ Warning Threshold'
                    : '✅ Healthy Pace'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Budgets Grid */}
          {currentMonthBudgets.length === 0 ? (
            <div className="fintech-card p-12 text-center">
              <span className="text-4xl block mb-2">🎯</span>
              <h3 className="text-sm font-bold text-[#0F172A] dark:text-white">
                No budgets set for {activeMonth}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Set category limits to keep your expenses in check or let our AI auto-generate a 50/30/20 plan.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenCreate}
                  className="px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold shadow-md hover:bg-blue-700 transition-all"
                >
                  + Add Manual Budget
                </button>
                <button
                  onClick={() => { setActiveTab('ai_recommendation'); handleGenerateAIBudget() }}
                  className="px-4 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#7C3AED] dark:text-purple-300 text-xs font-bold border border-purple-200 dark:border-purple-800"
                >
                  ✨ AI Auto-Recommend
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentMonthBudgets.map((b) => (
                <div
                  key={b.id}
                  className="fintech-card fintech-card-hover p-5 space-y-3.5 relative"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm shrink-0">
                        {CATEGORY_ICONS[b.category] || '📦'}
                      </span>
                      <div>
                        <h4 className="font-bold text-[#0F172A] dark:text-white text-sm">{b.category}</h4>
                        <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                          Limit: {formatMoney(b.limitAmount, currency)}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        b.status === 'exceeded'
                          ? 'bg-red-50 text-[#EF4444] dark:bg-red-950/60'
                          : b.status === 'near_limit'
                          ? 'bg-amber-50 text-[#F59E0B] dark:bg-amber-950/60'
                          : b.status === 'warning'
                          ? 'bg-amber-50 text-[#F59E0B] dark:bg-amber-950/60'
                          : 'bg-emerald-50 text-[#10B981] dark:bg-emerald-950/60'
                      }`}
                    >
                      {b.status === 'exceeded' ? 'Exceeded' : `${b.percentage}% Used`}
                    </span>
                  </div>

                  {/* Horizontal Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColors[b.status]}`}
                        style={{ width: `${Math.min(b.percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#0F172A] dark:text-white tabular-numbers">
                        Spent: {formatMoney(b.spentAmount, currency)}
                      </span>
                      <span className={b.remainingAmount > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                        {b.remainingAmount > 0
                          ? `Remaining: ${formatMoney(b.remainingAmount, currency)}`
                          : `Over by ${formatMoney(b.spentAmount - b.limitAmount, currency)}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                    <button
                      onClick={() => handleOpenEdit(b)}
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-950 text-xs transition-colors"
                      title="Edit Limit"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(b.id)}
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950 text-xs transition-colors"
                      title="Delete Budget"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AI 50/30/20 BUDGET RECOMMENDATION ── */}
      {activeTab === 'ai_recommendation' && (
        <div className="space-y-6">
          <div className="fintech-card bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-[#0F172A] dark:to-slate-900 p-6 sm:p-8 border border-[#E2E8F0] dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300">
                  ✨ AI 50/30/20 Rule Analysis
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-2 text-[#0F172A] dark:text-white">
                  Intelligent 50/30/20 Budget Model
                </h3>
                <p className="text-xs text-[#64748B] dark:text-slate-400 max-w-xl mt-1 leading-relaxed">
                  Based on your monthly income ({formatMoney(user?.monthlyIncome || 60000, currency)}), our AI allocates 50% for Needs, 30% for Wants, and 20% for Savings.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateAIBudget}
                  disabled={aiLoading}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white text-xs font-bold hover:bg-[#F8FAFC] transition-all"
                >
                  {aiLoading ? 'Analyzing...' : '🔄 Recalculate'}
                </button>
                <button
                  onClick={handleApplyAIBudgets}
                  disabled={aiLoading || !aiBudget}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
                >
                  ⚡ Apply to My Budgets
                </button>
              </div>
            </div>
          </div>

          {aiBudget && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Needs Card (50%) */}
              <div className="fintech-card p-6 space-y-3 border-t-3 border-t-[#2563EB]">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🏠</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-[#2563EB] dark:bg-blue-950 dark:text-blue-300">
                    50% Needs
                  </span>
                </div>
                <h4 className="text-base font-black text-[#0F172A] dark:text-white">Essential Living</h4>
                <p className="text-2xl font-black text-[#2563EB] tabular-numbers">
                  {formatMoney(aiBudget.needs?.amount || 30000, currency)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {aiBudget.needs?.description || 'Rent, groceries, utilities, transportation, and health coverage.'}
                </p>
              </div>

              {/* Wants Card (30%) */}
              <div className="fintech-card p-6 space-y-3 border-t-3 border-t-[#7C3AED]">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎉</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-[#7C3AED] dark:bg-purple-950 dark:text-purple-300">
                    30% Wants
                  </span>
                </div>
                <h4 className="text-base font-black text-[#0F172A] dark:text-white">Lifestyle & Fun</h4>
                <p className="text-2xl font-black text-[#7C3AED] tabular-numbers">
                  {formatMoney(aiBudget.wants?.amount || 18000, currency)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {aiBudget.wants?.description || 'Dining out, shopping, hobbies, streaming subscriptions, and entertainment.'}
                </p>
              </div>

              {/* Savings Card (20%) */}
              <div className="fintech-card p-6 space-y-3 border-t-3 border-t-[#10B981]">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🌱</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-[#10B981] dark:bg-emerald-950 dark:text-emerald-300">
                    20% Savings
                  </span>
                </div>
                <h4 className="text-base font-black text-[#0F172A] dark:text-white">Wealth & Safety</h4>
                <p className="text-2xl font-black text-[#10B981] tabular-numbers">
                  {formatMoney(aiBudget.savings?.amount || 12000, currency)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                  {aiBudget.savings?.description || 'Emergency fund, investments, mutual funds, and long-term targets.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: YEARLY PROJECTION PLANNER ── */}
      {activeTab === 'yearly' && (
        <div className="fintech-card p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Yearly Budget Projection</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Annual expenditure forecast based on your current active category limits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Annual Budget Cap</p>
              <p className="text-xl font-black text-[#0F172A] dark:text-white mt-1 tabular-numbers">
                {formatMoney(totalBudgeted * 12, currency)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Annual Expense Pace</p>
              <p className="text-xl font-black text-[#EF4444] mt-1 tabular-numbers">
                {formatMoney(totalSpent * 12, currency)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Target Annual Surplus</p>
              <p className="text-xl font-black text-[#10B981] mt-1 tabular-numbers">
                {formatMoney(Math.max(0, (user?.monthlyIncome || 60000) * 12 - totalBudgeted * 12), currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT BUDGET MODAL ── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-md w-full border border-[#E2E8F0] dark:border-slate-800 shadow-2xl space-y-4 animate-fade-in-up">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-base font-bold text-[#0F172A] dark:text-white">
                  {editingBudget ? 'Edit Category Budget' : 'Create New Category Budget'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-xs font-bold text-[#64748B] hover:text-[#0F172A] dark:hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0F172A] dark:text-white mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c] || '📦'} {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-white mb-1.5">Monthly Limit Amount ({currency}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={limitAmount}
                  onChange={(e) => setLimitAmount(e.target.value)}
                  placeholder="e.g. 8000"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0F172A] dark:text-white mb-1.5">Month</label>
                <input
                  type="month"
                  value={activeMonth}
                  onChange={(e) => setActiveMonth(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#0F172A] dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingBudget ? 'Update Budget' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deletingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-sm w-full border border-[#E2E8F0] dark:border-slate-800 shadow-2xl space-y-3 animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#EF4444] flex items-center justify-center text-xl">
              🗑️
            </div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Delete Category Budget?</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              This will remove the spending cap limit for this category. Existing transactions will remain untouched.
            </p>
            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <button
                onClick={() => setDeletingId(null)}
                className="py-2.5 rounded-xl border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#64748B]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="py-2.5 rounded-xl bg-[#EF4444] hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-500/20 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
