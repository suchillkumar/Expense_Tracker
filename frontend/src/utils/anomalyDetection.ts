import { Transaction } from '../types'

export interface Anomaly {
  transactionId: string
  description: string
  amount: number
  date: string
  zScore: number
  severity: 'low' | 'medium' | 'high'
  reason?: string
}


export function detectAnomalies(
  transactions: Transaction[],
  lookbackDays = 90,
  threshold = 2.5
): Anomaly[] {
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000
  const expenses = transactions.filter(
    (tx) => tx.type === 'expense' && new Date(tx.date).getTime() >= cutoff
  )
  if (expenses.length < 3) return []

  const amounts = expenses.map((tx) => tx.amount)
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length
  const variance =
    amounts.reduce((acc, a) => acc + (a - mean) ** 2, 0) / amounts.length
  const std = Math.sqrt(variance)

  if (std === 0) return []

  const anomalies: Anomaly[] = []
  for (const tx of expenses) {
    const zScore = (tx.amount - mean) / std
    if (zScore > threshold) {
      anomalies.push({
        transactionId: tx.id,
        description: tx.description,
        amount: tx.amount,
        date: tx.date,
        zScore,
        severity: zScore > 4 ? 'high' : zScore > 3 ? 'medium' : 'low'
      })
    }
  }
  return anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 10)
}
