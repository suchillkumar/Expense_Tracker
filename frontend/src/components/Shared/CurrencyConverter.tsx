import { useState } from 'react'
import { getSymbol } from '../../services/currencyService'

export function CurrencyConverter() {
  const [amount, setAmount] = useState('100')
  const [open, setOpen] = useState(false)

  const value = Number(amount) || 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <span className="text-base">💱</span> Converter
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Currency Converter</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Amount (INR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 outline-none"
              />
            </div>
            <div className="bg-sky-50 rounded-lg p-3 text-center border border-sky-100">
              <p className="text-xs text-gray-500">Amount in INR</p>
              <p className="text-xl font-bold text-sky-700">
                {getSymbol('INR')} {value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
