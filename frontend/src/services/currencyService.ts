export const SUPPORTED_CURRENCIES = ['INR'] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export function getSymbol(_currency: string = 'INR'): string {
  return 'Rs.'
}

export function formatMoney(amount: number, _currency: string = 'INR'): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 10000000) {
    return `${sign}Rs.${(abs / 10000000).toFixed(2)} Cr`
  }
  if (abs >= 100000) {
    return `${sign}Rs.${(abs / 100000).toFixed(2)} L`
  }
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(abs)
  return sign + formatted
}
