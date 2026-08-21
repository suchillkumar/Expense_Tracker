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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-[#E2E8F0] dark:border-[#334155] animate-fade-in-up text-left">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-[#F87171] flex items-center justify-center text-xl mb-3">
          🗑️
        </div>

        <h3 className="text-base font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
          Delete Transaction?
        </h3>
        <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal leading-relaxed">
          Are you sure you want to permanently remove this transaction? Your balance, budget limits, and charts will recalculate immediately.
        </p>

        {/* Transaction Summary Preview */}
        <div className="bg-slate-50 dark:bg-[#243244] rounded-2xl p-4 my-4 border border-[#E2E8F0] dark:border-[#334155] space-y-2 text-sm">
          <div className="flex justify-between items-center font-semibold text-[#1E293B] dark:text-[#F8FAFC]">
            <span className="truncate max-w-[200px]">{transaction.description}</span>
            <span className={`tabular-numbers ${transaction.type === 'income' ? 'text-[#16A34A] dark:text-[#22C55E]' : 'text-[#DC2626] dark:text-[#F87171]'}`}>
              {transaction.type === 'income' ? '+' : '−'}{formatMoney(transaction.amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-[#64748B] dark:text-[#94A3B8] text-xs font-normal">
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
            className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#243244] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="px-5 py-2.5 rounded-xl bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium shadow-xs transition-all flex items-center gap-1.5"
          >
            {deleting ? 'Deleting...' : 'Delete Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
