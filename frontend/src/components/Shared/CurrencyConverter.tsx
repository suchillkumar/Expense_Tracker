import { useState } from 'react'
import { CURRENCIES } from '../../types'
import { useExpense } from '../../context/ExpenseContext'
import { convertCurrency, formatMoney } from '../../services/currencyService'

export function CurrencyConverter() {
  const { currency: userCurrency } = useExpense()
  const [amount, setAmount] = useState('100')
  const [fromCurrency, setFromCurrency] = useState(userCurrency || 'INR')
  const [toCurrency, setToCurrency] = useState('USD')
  const [open, setOpen] = useState(false)

  const value = Number(amount) || 0
  const converted = convertCurrency(value, fromCurrency, toCurrency)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#243244] transition-colors"
      >
        <span className="text-base">💱</span> Converter
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl border border-[#E2E8F0] dark:border-[#334155] p-5 z-30 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Currency Converter</h3>
            <button
              onClick={() => setOpen(false)}
              className="text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] rounded-xl px-3.5 py-2 text-sm text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">From</label>
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value)}
                  className="w-full border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] rounded-xl px-2.5 py-2 text-xs font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8] mb-1">To</label>
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value)}
                  className="w-full border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] rounded-xl px-2.5 py-2 text-xs font-medium text-[#1E293B] dark:text-[#F8FAFC] outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-900/40">
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {formatMoney(value, fromCurrency)} =
              </p>
              <p className="text-lg font-bold text-[#2563EB] dark:text-[#60A5FA] mt-0.5">
                {formatMoney(converted, toCurrency)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
