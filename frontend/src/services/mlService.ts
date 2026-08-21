import { Transaction } from '../types'

export interface ForecastPoint {
  label: string
  value: number
}

export function predictNextMonths(
  transactions: Transaction[],
  monthsAhead = 3
): ForecastPoint[] {
  const now = new Date()
  const byMonth = new Map<string, number>()
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1)
    byMonth.set(`${d.getFullYear()}-${d.getMonth()}`, 0)
  }
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (byMonth.has(key)) byMonth.set(key, (byMonth.get(key) ?? 0) + tx.amount)
  }
  const series = Array.from(byMonth.values())
  const slope = linearSlope(series)
  const intercept = linearIntercept(series)
  const base = intercept + slope * (series.length - 1)

  const points: ForecastPoint[] = []
  for (let i = 1; i <= monthsAhead; i++) {
    const predicted = Math.max(0, base + slope * i)
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    points.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      value: predicted
    })
  }
  return points
}

function linearSlope(values: number[]): number {
  const n = values.length
  if (n === 0) return 0
  const meanX = (n - 1) / 2
  const meanY = values.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  values.forEach((y, x) => {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) ** 2
  })
  return den === 0 ? 0 : num / den
}

function linearIntercept(values: number[]): number {
  const n = values.length
  if (n === 0) return 0
  const meanX = (n - 1) / 2
  const meanY = values.reduce((a, b) => a + b, 0) / n
  return meanY - linearSlope(values) * meanX
}

export function categorizeSpending(transactions: Transaction[]): Record<string, number> {
  const result: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    result[tx.category] = (result[tx.category] ?? 0) + tx.amount
  }
  return result
}

export function detectRecurringBills(transactions: Transaction[]): string[] {
  const counts: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense') continue
    counts[tx.description.toLowerCase()] = (counts[tx.description.toLowerCase()] ?? 0) + 1
  }
  return Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([desc]) => desc)
}
