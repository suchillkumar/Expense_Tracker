import type { ColumnMapping } from '../../services/import/types'

const TARGET_FIELDS = [
  { key: 'date',        label: 'Date',        icon: '📅', required: true,  accent: 'brand' },
  { key: 'description', label: 'Description', icon: '📝', required: true,  accent: 'brand' },
  { key: 'amount',      label: 'Amount',      icon: '💰', required: true,  accent: 'brand' },
  { key: 'type',        label: 'Type',         icon: '🔄', required: false, accent: 'slate' },
  { key: 'category',    label: 'Category',     icon: '🏷', required: false, accent: 'slate' },
  { key: 'notes',       label: 'Notes',        icon: '📎', required: false, accent: 'slate' },
  { key: 'tags',        label: 'Tags',         icon: '🔖', required: false, accent: 'slate' },
  { key: 'debit',       label: 'Debit Column', icon: '⬇️', required: false, accent: 'slate' },
  { key: 'credit',      label: 'Credit Column',icon: '⬆️', required: false, accent: 'slate' },
] as const

interface Props {
  sourceHeaders: string[]
  mapping: ColumnMapping
  onChange: (mapping: ColumnMapping) => void
}

export function ColumnMapper({ sourceHeaders, mapping, onChange }: Props) {
  const update = (field: string, value: string) => {
    onChange({ ...mapping, [field]: value })
  }

  const autoMap = () => {
    const auto: ColumnMapping = {
      date: '', description: '', amount: '', type: '', category: '',
      notes: '', tags: '', debit: '', credit: ''
    }
    const aliases: Record<string, string[]> = {
      date: ['date', 'transactiondate', 'transaction_date', 'postdate', 'valuedate', 'dt', 'posted'],
      description: ['description', 'narration', 'particulars', 'details', 'memo', 'remarks', 'payee', 'merchant'],
      amount: ['amount', 'transactionamount', 'txnamount', 'value', 'sum', 'total'],
      type: ['type', 'transactiontype', 'txntype'],
      category: ['category', 'group', 'tag'],
      notes: ['notes', 'note', 'remark', 'comments'],
      tags: ['tags', 'tag', 'labels'],
      debit: ['debit', 'dramount', 'withdrawal', 'dr'],
      credit: ['credit', 'cramount', 'deposit', 'cr'],
    }
    for (const header of sourceHeaders) {
      const norm = header.toLowerCase().replace(/[^a-z]/g, '')
      for (const [field, keys] of Object.entries(aliases)) {
        if (!auto[field as keyof ColumnMapping] && keys.some(k => norm.includes(k))) {
          auto[field as keyof ColumnMapping] = header
          break
        }
      }
    }
    if (!auto.amount && (auto.debit || auto.credit)) auto.amount = auto.debit || auto.credit
    onChange(auto)
  }

  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div className="glass-card rounded-2xl p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-ocean flex items-center justify-center text-white text-sm shadow-sm shadow-gray-200/50">
            🔗
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Map Your Columns</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Match source columns to fields · <span className="text-sky-600 font-semibold">{mappedCount}</span> mapped
            </p>
          </div>
        </div>
        <button
          onClick={autoMap}
          className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-semibold shadow-sm shadow-sky-500/10 flex items-center gap-1.5"
        >
          <span>✨</span> Auto-detect
        </button>
      </div>

      {/* Field grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {TARGET_FIELDS.filter(f => {
          if (f.key === 'debit' || f.key === 'credit') return !mapping.amount || mapping.amount === ''
          return true
        }).map((field) => {
          const val = mapping[field.key as keyof ColumnMapping] || ''
          return (
            <div
              key={field.key}
              className={`
                flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-300
                ${val
                  ? 'border-sky-200 bg-sky-50 shadow-sm shadow-sky-500/10'
                  : 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                }
              `}
            >
              {/* Icon */}
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 transition-colors duration-200 ${
                val ? 'bg-white shadow-sm' : 'bg-gray-100'
              }`}>
                {field.icon}
              </div>

              {/* Label + Select */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-semibold text-gray-700">{field.label}</span>
                  {field.required && <span className="text-[9px] font-bold text-sky-600">●</span>}
                </div>
                <select
                  value={val}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all duration-200"
                >
                  <option value="">— Skip —</option>
                  {sourceHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Checkmark */}
              {val && (
                <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[9px] shrink-0 shadow-sm shadow-sky-500/10">
                  ✓
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
