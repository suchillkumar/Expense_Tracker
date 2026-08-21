import { CURRENCIES } from '../types'

export const SUPPORTED_CURRENCIES = [
  'INR',
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'SGD',
  'AED',
] as const

export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number]

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  SGD: 'S$',
  AED: 'AED ',
}

export const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  CAD: 'en-CA',
  AUD: 'en-AU',
  SGD: 'en-SG',
  AED: 'en-AE',
}

// Baseline exchange rates relative to USD for realistic multi-currency conversion
export const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.28,
  CAD: 0.74,
  AUD: 0.66,
  SGD: 0.75,
  AED: 0.27,
  INR: 0.012,
}

export function getSymbol(currency: string = 'INR'): string {
  if (CURRENCY_SYMBOLS[currency]) return CURRENCY_SYMBOLS[currency]
  const found = CURRENCIES.find((c) => c.code === currency)
  return found?.symbol || currency
}

export function formatMoney(amount: number, currency: string = 'INR'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const abs = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  const symbol = getSymbol(currency)
  const locale = CURRENCY_LOCALES[currency] || 'en-US'

  // Indian number notation for INR (Cr / L)
  if (currency === 'INR') {
    if (abs >= 10000000) {
      return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`
    }
    if (abs >= 100000) {
      return `${sign}₹${(abs / 100000).toFixed(2)} L`
    }
  } else {
    // International standard notation (M / B)
    if (abs >= 1000000000) {
      return `${sign}${symbol}${(abs / 1000000000).toFixed(2)}B`
    }
    if (abs >= 1000000) {
      return `${sign}${symbol}${(abs / 1000000).toFixed(2)}M`
    }
  }

  const formattedNumber = abs.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return `${sign}${symbol}${formattedNumber}`
}

export function formatCompact(amount: number, currency: string = 'INR'): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0
  const symbol = getSymbol(currency)
  return `${symbol}${num.toLocaleString()}`
}

export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return amount
  const fromRate = EXCHANGE_RATES_TO_USD[fromCurrency] || 1
  const toRate = EXCHANGE_RATES_TO_USD[toCurrency] || 1
  const inUSD = amount * fromRate
  return inUSD / toRate
}
