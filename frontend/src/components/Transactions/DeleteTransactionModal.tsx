import { useState } from 'react'
import { Transaction } from '../../types'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../services/currencyService'

interface DeleteTransactionModalProps {
  transaction: Transaction
  onClose: () => void
}

export function DeleteTransactionModal({ transaction, onClose }: DeleteTransactionModalProps) {
  const { deleteTransaction, currency } = useExpense()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteTransaction(transaction.id)
      toast.success('Transaction deleted successfully.')
      onClose()
    } catch {
      toast.error('Failed to delete transaction. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-800 animate-scale-in text-left">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl mb-4">
          🗑️
        </div>

        <h3 className="text-lg font-black text-gray-900 dark:text-white">
          Delete Transaction?
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Are you sure you want to permanently remove this transaction? Your balance, budget limits, and charts will recalculate immediately.
        </p>

        {/* Transaction Summary Preview */}
        <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 my-4 border border-gray-100 dark:border-slate-700/60 space-y-2 text-xs">
          <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
            <span className="truncate max-w-[200px]">{transaction.description}</span>
            <span className={transaction.type === 'income' ? 'text-emerald-600' : 'text-red-500'}>
              {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-gray-400 text-[11px]">
            <span>Category: {transaction.category}</span>
            <span>{new Date(transaction.date).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
          >
            {deleting ? 'Deleting...' : 'Delete Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
