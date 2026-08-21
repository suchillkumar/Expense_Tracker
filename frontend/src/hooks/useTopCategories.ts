import { useMemo } from 'react'
import { useExpense } from '../context/ExpenseContext'

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Other']

/**
 * Returns the user's most-used categories ranked by transaction frequency.
 * Falls back to a sensible default list when there is no history.
 */
export function useTopCategories(limit = 5): string[] {
  const { transactions } = useExpense()

  return useMemo(() => {
    if (transactions.length === 0) return DEFAULT_CATEGORIES.slice(0, limit)

    const counts = new Map<string, number>()
    for (const tx of transactions) {
      counts.set(tx.category, (counts.get(tx.category) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cat]) => cat)
  }, [transactions, limit])
}
