import { useState, useEffect } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { Transaction, TransactionType } from '../../types'
import { categorize } from '../../services/categorizationService'
import { getSymbol } from '../../services/currencyService'

interface TransactionFormProps {
  initial?: Transaction | null
  presetType?: TransactionType
  onClose: () => void
}

const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Education',
  'Healthcare',
  'Travel',
  'Other',
]

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Other',
]

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking']

export function TransactionForm({ initial, presetType = 'expense', onClose }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currency } = useExpense()
  const toast = useToast()

  const [type, setType] = useState<TransactionType>(initial?.type || presetType)
  const [description, setDescription] = useState(initial?.description || '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || 'Food')
  const [date, setDate] = useState(initial?.date ? initial.date.split('T')[0] : new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || 'UPI')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI Categorization Recommendation State
  const [aiSuggestedCat, setAiSuggestedCat] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)

  // Trigger real-time categorization as description is typed
  useEffect(() => {
    if (!initial && description.trim().length >= 3 && type === 'expense') {
      const match = categorize(description)
      if (match.category && match.confidence >= 0.6 && match.category !== category) {
        setAiSuggestedCat(match.category)
        setConfidence(Math.round(match.confidence * 100))
      } else {
        setAiSuggestedCat(null)
      }
    } else {
      setAiSuggestedCat(null)
    }
  }, [description, type, initial, category])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.')
      return
    }
    if (!description.trim()) {
      setError('Please provide a description.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: new Date(date).toISOString(),
        paymentMethod,
        notes: notes.trim(),
      }

      if (initial?.id) {
        await updateTransaction({ ...payload, id: initial.id } as Transaction)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-[#E2E8F0] dark:border-[#334155] w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#334155]">
          <div>
            <h2 className="text-base font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
              {initial ? 'Edit Transaction' : type === 'income' ? 'Add Income' : 'Add Expense'}
            </h2>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-normal mt-0.5">
              {initial ? 'Update record details' : 'Record a new cashflow movement'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-[#64748B] hover:text-[#1E293B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#243244] transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-[#243244] p-1.5 rounded-2xl border border-[#E2E8F0] dark:border-[#334155]">
            <button
              type="button"
              onClick={() => { setType('expense'); setCategory('Food') }}
              className={`py-2 rounded-xl text-sm font-medium transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-[#1E293B] text-[#DC2626] dark:text-[#F87171] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              💸 Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setCategory('Salary') }}
              className={`py-2 rounded-xl text-sm font-medium transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-[#1E293B] text-[#16A34A] dark:text-[#22C55E] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              💰 Income
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
              Description *
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Food delivery, Taxi commute, Netflix, Salary"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none font-normal"
              autoFocus
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Amount ({getSymbol(currency)} {currency}) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B] dark:text-[#94A3B8]">
                  {getSymbol(currency)}
                </span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none font-normal"
              />
            </div>
          </div>

          {/* Category with AI Auto-Categorization */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC]">
                Category *
              </label>
              {aiSuggestedCat && (
                <button
                  type="button"
                  onClick={() => setCategory(aiSuggestedCat)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#7C3AED] dark:text-[#A78BFA] bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors"
                >
                  <span>✨ AI Suggested:</span>
                  <span className="underline font-semibold">{aiSuggestedCat}</span>
                  <span className="text-[10px] opacity-75">({confidence}%)</span>
                </button>
              )}
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none font-normal"
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
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none font-normal"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Remarks or reference ID"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none font-normal"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#DC2626] dark:text-[#F87171] bg-red-50 dark:bg-red-950/40 rounded-xl px-4 py-2.5 border border-red-200 dark:border-red-900 animate-fade-in font-medium">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#243244] text-sm font-medium flex-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-sm font-medium shadow-xs flex-1 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
