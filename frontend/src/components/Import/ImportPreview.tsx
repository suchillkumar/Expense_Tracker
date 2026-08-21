import { useState } from 'react'
import type { ImportRow } from '../../services/import/types'
import { CATEGORIES } from '../../types'
import { useExpense } from '../../context/ExpenseContext'
import { formatMoney } from '../../services/currencyService'

interface Props {
  rows: ImportRow[]
  duplicates: Set<number>
  internalDuplicates: Set<number>
  onChange: (rows: ImportRow[]) => void
}

export function ImportPreview({ rows, duplicates, internalDuplicates, onChange }: Props) {
  const { currency } = useExpense()
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 25
  const totalPages = Math.ceil(rows.length / pageSize)
  const visible = rows.slice(page * pageSize, (page + 1) * pageSize)

  const updateCell = (rowIdx: number, field: keyof ImportRow, value: any) => {
    const actualIdx = page * pageSize + rowIdx
    const updated = [...rows]
    updated[actualIdx] = { ...updated[actualIdx], [field]: value }
    onChange(updated)
  }

  const removeRow = (rowIdx: number) => {
    const actualIdx = page * pageSize + rowIdx
    onChange(rows.filter((_, i) => i !== actualIdx))
  }

  const totalAmount = rows.reduce((s, r) => s + (r.type === 'expense' ? -r.amount : r.amount), 0)
  const validCount = rows.filter(r => r.errors.length === 0).length
  const errCount = rows.filter(r => r.errors.length > 0).length

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl gradient-primary-subtle flex items-center justify-center text-base shadow-sm">👁</span>
            Preview & Edit
          </h3>
          <span className="text-[10px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-semibold">
            {rows.length} rows
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-[11px] font-semibold">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
            <span className="status-dot bg-green-500" />
            {validCount} valid
          </span>
          {duplicates.size > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              <span className="status-dot bg-amber-500" />
              {duplicates.size} dups
            </span>
          )}
          {errCount > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">
              <span className="status-dot bg-red-500" />
              {errCount} errors
            </span>
          )}
          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
            totalAmount >= 0
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {totalAmount >= 0 ? '+' : ''}{formatMoney(totalAmount, currency)}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50">
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description</th>
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Amount</th>
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
              <th className="py-3 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
              <th className="py-3 px-3 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((row, vi) => {
              const globalIdx = page * pageSize + vi
              const isDup = duplicates.has(globalIdx) || internalDuplicates.has(globalIdx)
              const hasErr = row.errors.length > 0
              return (
                <tr
                  key={vi}
                  className={`
                    transition-colors duration-150
                    ${hasErr
                      ? 'bg-red-50 hover:bg-red-100/70'
                      : isDup
                        ? 'bg-amber-50 hover:bg-amber-100/60'
                        : 'hover:bg-sky-50/20'
                    }
                  `}
                >
                  <td className="py-2.5 px-3 text-[10px] text-gray-400 font-mono">
                    <div className="flex items-center gap-1">
                      {globalIdx + 1}
                      {isDup && (
                        <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-px rounded font-bold leading-none" title="Duplicate">⚡</span>
                      )}
                      {hasErr && (
                        <span className="text-[8px] bg-red-100 text-red-600 px-1 py-px rounded font-bold leading-none" title={row.errors.join('; ')}>⚠</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    {editingCell?.row === vi && editingCell.field === 'date' ? (
                      <input type="date" value={row.date} autoFocus
                        onChange={(e) => updateCell(vi, 'date', e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-32 border border-sky-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white shadow-sm"
                      />
                    ) : (
                      <span onClick={() => setEditingCell({ row: vi, field: 'date' })}
                        className="text-xs text-gray-400 cursor-pointer hover:text-sky-600 hover:bg-sky-50 px-1.5 py-0.5 rounded-md transition-colors duration-150 inline-block">
                        {row.date}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {editingCell?.row === vi && editingCell.field === 'description' ? (
                      <input type="text" value={row.description} autoFocus
                        onChange={(e) => updateCell(vi, 'description', e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="w-full border border-sky-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white shadow-sm"
                      />
                    ) : (
                      <span onClick={() => setEditingCell({ row: vi, field: 'description' })}
                        className="text-xs font-medium text-gray-900 cursor-pointer hover:text-sky-600 hover:bg-sky-50 px-1.5 py-0.5 rounded-md transition-colors duration-150 block max-w-[200px] truncate"
                        title={row.description}>
                        {row.description}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {editingCell?.row === vi && editingCell.field === 'amount' ? (
                      <input type="number" step="0.01" value={row.amount} autoFocus
                        onChange={(e) => updateCell(vi, 'amount', parseFloat(e.target.value) || 0)}
                        onBlur={() => setEditingCell(null)}
                        className="w-24 border border-sky-300 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white shadow-sm"
                      />
                    ) : (
                      <span onClick={() => setEditingCell({ row: vi, field: 'amount' })}
                        className={`text-xs font-semibold cursor-pointer hover:bg-sky-50 px-1.5 py-0.5 rounded-md transition-colors duration-150 inline-block ${
                          row.type === 'income' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                        {row.type === 'income' ? '+' : '−'}{formatMoney(row.amount, currency)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <select value={row.type} onChange={(e) => updateCell(vi, 'type', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-150">
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <select value={row.category} onChange={(e) => updateCell(vi, 'category', e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all duration-150">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <button onClick={() => removeRow(vi)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-lg transition-all duration-150"
                      title="Remove row">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-35 disabled:pointer-events-none transition-all duration-200">
            ← Prev
          </button>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 3, totalPages - 7))
              const p = start + i
              if (p >= totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                    p === page
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/10'
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}>
                  {p + 1}
                </button>
              )
            })}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-semibold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-35 disabled:pointer-events-none transition-all duration-200">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
