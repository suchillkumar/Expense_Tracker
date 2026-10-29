import { useState, useEffect, useRef } from 'react'
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
  { name: 'Food', icon: '🍔' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills', icon: '⚡' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Education', icon: '📚' },
  { name: 'Healthcare', icon: '💊' },
  { name: 'Travel', icon: '✈️' },
  { name: 'Other', icon: '📦' },
]

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: '💼' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Investment', icon: '📈' },
  { name: 'Gift', icon: '🎁' },
  { name: 'Other', icon: '📦' },
]

const PAYMENT_METHODS = [
  { name: 'UPI', icon: '⚡' },
  { name: 'Credit Card', icon: '💳' },
  { name: 'Debit Card', icon: '🏦' },
  { name: 'Cash', icon: '💵' },
  { name: 'Net Banking', icon: '🌐' },
]

export function TransactionForm({ initial, presetType = 'expense', onClose }: TransactionFormProps) {
  const { addTransaction, updateTransaction, currency } = useExpense()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<TransactionType>(initial?.type || presetType)
  const [description, setDescription] = useState(initial?.description || '')
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category || (type === 'income' ? 'Salary' : 'Food'))
  const [date, setDate] = useState(() => {
    if (initial?.date) return initial.date.split('T')[0]
    return new Date().toISOString().split('T')[0]
  })
  const [time, setTime] = useState(() => {
    if (initial?.date && initial.date.includes('T')) {
      const t = initial.date.split('T')[1]
      return t.slice(0, 5)
    }
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod || 'UPI')
  const [notes, setNotes] = useState(initial?.notes || '')
  const [receiptImage, setReceiptImage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // AI Categorization Suggestion
  const [aiSuggestedCat, setAiSuggestedCat] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(0)

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

  // Quick amount increment chips
  const quickAmounts = currency === 'USD' || currency === 'EUR' || currency === 'GBP'
    ? [10, 25, 50, 100, 250]
    : [100, 200, 500, 1000, 2000]

  const handleQuickAdd = (increment: number) => {
    const current = parseFloat(amount) || 0
    setAmount(String(current + increment))
  }

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Receipt image must be smaller than 5MB.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      setReceiptImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.')
      return
    }
    if (!description.trim()) {
      setError('Please provide a title or description.')
      return
    }

    setSaving(true)
    try {
      const dateTimeString = `${date}T${time}:00.000Z`
      const payload = {
        type,
        description: description.trim(),
        amount: parsedAmount,
        category,
        date: dateTimeString,
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

  const categoryList = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#0F172A] w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col z-10 overflow-hidden animate-fade-in-up">
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${
                type === 'income'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {type === 'income' ? '💰' : '💸'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {initial ? 'Edit Transaction' : type === 'income' ? 'Record Income' : 'Record Expense'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {initial ? 'Update entry details' : 'Enter amount and transaction details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* 1. Income / Expense Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                setType('expense')
                if (!initial) setCategory('Food')
              }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200/50 dark:border-rose-900/50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>🔴</span> Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income')
                if (!initial) setCategory('Salary')
              }}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50 dark:border-emerald-900/50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <span>🟢</span> Income
            </button>
          </div>

          {/* 2. Amount Input Hero with Currency Formatting & Quick Chips */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Amount ({currency}) *
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <span className="text-xl sm:text-2xl font-black text-slate-400 dark:text-slate-500">
                  {getSymbol(currency)}
                </span>
              </div>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full pl-12 pr-4 py-3 sm:py-3.5 rounded-2xl border text-xl sm:text-2xl font-black outline-none transition-all tabular-numbers ${
                  type === 'income'
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500'
                }`}
                autoFocus
              />
            </div>

            {/* Quick Increment Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick:</span>
              {quickAmounts.map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleQuickAdd(inc)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60"
                >
                  +{inc}
                </button>
              ))}
              {amount && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors ml-auto"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* 3. Title / Description Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Transaction Title *
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Grocery run, Office lunch, Client milestone"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            />
          </div>

          {/* AI Category Suggestion Pill */}
          {aiSuggestedCat && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <div>
                  <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    Smart Category Match: <span className="underline">{aiSuggestedCat}</span>
                  </p>
                  <p className="text-[10px] text-purple-700 dark:text-purple-400">
                    {confidence}% AI match based on your transaction title
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategory(aiSuggestedCat)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Apply
              </button>
            </div>
          )}

          {/* 4. Visual Category Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Select Category *
              </label>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {category}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categoryList.map((cat) => {
                const isSelected = category === cat.name
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-xl sm:text-2xl mb-1">{cat.icon}</span>
                    <span
                      className={`text-[11px] truncate w-full ${
                        isSelected
                          ? 'font-bold text-blue-700 dark:text-blue-300'
                          : 'font-medium text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 5. Date & Time Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* 6. Payment Method Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payment Method
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {PAYMENT_METHODS.map((pm) => {
                const isSelected = paymentMethod === pm.name
                return (
                  <button
                    key={pm.name}
                    type="button"
                    onClick={() => setPaymentMethod(pm.name)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{pm.icon}</span>
                    <span>{pm.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 7. Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add optional notes, invoice ID, or location..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
            />
          </div>

          {/* 8. Optional Receipt Attachment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Receipt / Bill Attachment (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            {receiptImage ? (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <img
                  src={receiptImage}
                  alt="Receipt Preview"
                  className="w-14 h-14 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shadow-xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Receipt attached</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Ready to save</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReceiptImage(null)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                <span>📎</span> Attach Receipt or Invoice Photo
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
        </form>

        {/* Sticky Actions Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={submit}
            className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              type === 'income'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
            }`}
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <span>{initial ? 'Save Changes' : type === 'income' ? 'Save Income' : 'Save Expense'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
