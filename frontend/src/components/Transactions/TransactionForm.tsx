import { useEffect, useState } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, Transaction, TransactionType } from '../../types'
import { todayISO } from '../../utils/format'
import { categorize } from '../../services/categorizationService'

interface TransactionFormProps {
  initial?: Transaction | null
  presetType?: TransactionType
  onClose: () => void
}

export function TransactionForm({ initial, presetType = 'expense', onClose }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currency } = useExpense()
  const toast = useToast()

  const [type, setType] = useState<TransactionType>(initial?.type ?? presetType)
  const [description, setDescription] = useState(initial?.description ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? (presetType === 'income' ? 'Salary' : 'Food'))
  const [date, setDate] = useState(initial?.date ? initial.date.slice(0, 10) : todayISO())
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? 'UPI')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  // AI Auto-Categorization state (Section 18)
  const [aiSuggestedCat, setAiSuggestedCat] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)

  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Real-time AI prediction as user types description
  useEffect(() => {
    if (initial) return
    if (!description.trim() || description.length < 2) {
      setAiSuggestedCat(null)
      return
    }

    if (type === 'income') {
      const lower = description.toLowerCase()
      if (lower.includes('salary') || lower.includes('paycheck') || lower.includes('wage')) {
        setCategory('Salary')
      } else if (lower.includes('freelance') || lower.includes('client') || lower.includes('consult')) {
        setCategory('Freelance')
      } else if (lower.includes('dividend') || lower.includes('interest') || lower.includes('stock')) {
        setCategory('Investment')
      }
      return
    }

    // Expense AI Categorization
    const res = categorize(description)
    if (res && res.category) {
      setAiSuggestedCat(res.category)
      setConfidence(Math.min(Math.round(res.confidence * 100), 98))
      setCategory(res.category)
    }
  }, [description, type, initial])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    const num = Number(amount)
    if (!description.trim()) { setError('Please enter a description.'); return }
    if (!num || num <= 0) { setError('Please enter a valid amount greater than 0.'); return }

    setSaving(true)
    setError('')
    try {
      const payload: Omit<Transaction, 'id'> = {
        description: description.trim(),
        amount: num,
        type,
        category,
        date: new Date(date + 'T00:00:00').toISOString(),
        paymentMethod,
        notes: notes.trim() || undefined,
      }

      if (initial) {
        await updateTransaction({ ...payload, id: initial.id })
        toast.success('Transaction updated successfully.')
      } else {
        await addTransaction(payload)
        toast.success(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully!`)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const categoryOptions = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-lg max-h-[92vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-gray-900 dark:text-white">
              {initial ? 'Edit Transaction' : type === 'income' ? 'Add Income' : 'Add Expense'}
            </h2>
            <p className="text-xs text-gray-400">
              {initial ? 'Update record details' : 'Record a new cashflow movement'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory('Food') }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory('Salary') }}
              className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              💰 Income
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Swiggy food delivery, Uber commute, Netflix, Salary"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              autoFocus
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Category with AI Auto-Categorization */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Category *
              </label>
              {aiSuggestedCat && (
                <button
                  type="button"
                  onClick={() => setCategory(aiSuggestedCat)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800 animate-pulse hover:bg-indigo-100 transition-colors"
                >
                  <span>✨ AI Suggested:</span>
                  <span className="underline">{aiSuggestedCat}</span>
                  <span className="text-[9px] opacity-75">({confidence}%)</span>
                </button>
              )}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks or reference ID"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-200 dark:border-red-900 animate-fade-in">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-bold flex-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex-1 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
