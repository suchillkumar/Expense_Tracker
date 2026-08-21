import { formatMoney } from '../../services/currencyService'

interface DonutSegment { label: string; value: number; color: string }

export function DonutChart({ segments, size = 180 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return null

  const r = size / 2 - 10
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => {
            const pct = seg.value / total
            const dash = pct * circumference
            const el = (
              <circle
                key={i}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="24"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            )
            offset += dash
            return el
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total > 0 ? `${Math.round(segments.find(s => s.label === 'Savings')?.value || 0) / total * 100}%` : '0%'}</span>
          <span className="text-[10px] text-gray-400">savings</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-[11px] text-gray-600">{seg.label} ({Math.round(seg.value / total * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendBarChart({ labels, income, expenses }: { labels: string[]; income: number[]; expenses: number[] }) {
  const maxVal = Math.max(...income, ...expenses, 1)
  const height = 140
  const barWidth = 14
  const gap = 6
  const groupWidth = barWidth * 2 + gap + 16

  return (
    <div className="overflow-x-auto">
      <svg width={labels.length * groupWidth + 40} height={height + 30} className="mx-auto">
        {labels.map((label, i) => {
          const x = i * groupWidth + 20
          const incH = ((income[i] || 0) / maxVal) * height
          const expH = ((expenses[i] || 0) / maxVal) * height

          return (
            <g key={i}>
              {/* Income Bar */}
              <rect
                x={x}
                y={height - incH}
                width={barWidth}
                height={Math.max(incH, 2)}
                rx="4"
                fill="#10b981"
                className="transition-all duration-300 hover:opacity-80"
              >
                <title>{`Income: ${income[i] || 0}`}</title>
              </rect>
              {/* Expense Bar */}
              <rect
                x={x + barWidth + gap}
                y={height - expH}
                width={barWidth}
                height={Math.max(expH, 2)}
                rx="4"
                fill="#ef4444"
                className="transition-all duration-300 hover:opacity-80"
              >
                <title>{`Expenses: ${expenses[i] || 0}`}</title>
              </rect>
              {/* X Label */}
              <text
                x={x + barWidth + gap / 2}
                y={height + 18}
                textAnchor="middle"
                fontSize="10"
                fill="#9ca3af"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function MonthlyCashflowSparkline({ data, width = 280, height = 60 }: { data: { inc: number; exp: number }[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data.map(d => Math.max(d.inc, d.exp)), 1)
  const step = (width - 20) / (data.length - 1)

  const incPoints = data.map((d, i) => `${10 + i * step},${height - 10 - (d.inc / max) * (height - 20)}`).join(' ')
  const expPoints = data.map((d, i) => `${10 + i * step},${height - 10 - (d.exp / max) * (height - 20)}`).join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={incPoints} />
      <polyline fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={expPoints} />
      {data.map((_, i) => (
        <circle key={i} cx={10 + i * step} cy={height - 10 - (data[i].inc / max) * (height - 20)} r="3" fill="#10b981" />
      ))}
      {data.map((_, i) => (
        <circle key={i} cx={10 + i * step} cy={height - 10 - (data[i].exp / max) * (height - 20)} r="3" fill="#ef4444" />
      ))}
      <line x1={width - 100} y1={10} x2={width - 88} y2={10} stroke="#10b981" strokeWidth="2.5" />
      <text x={width - 84} y={14} fontSize="10" fill="#6b7280">Income</text>
      <line x1={width - 100} y1={26} x2={width - 88} y2={26} stroke="#ef4444" strokeWidth="2.5" />
      <text x={width - 84} y={30} fontSize="10" fill="#6b7280">Expenses</text>
    </svg>
  )
}

export function SavingsCompareChart({ monthly, yearly, currency = 'INR' }: { monthly: number; yearly: number; currency?: string }) {
  const max = Math.max(yearly, 1)
  const mW = (monthly / max) * 100
  const yW = 100

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Monthly Savings</span>
          <span className="font-semibold text-emerald-600">{formatMoney(monthly, currency)}</span>
        </div>
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${mW}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Yearly Savings</span>
          <span className="font-semibold text-sky-600">{formatMoney(yearly, currency)}</span>
        </div>
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all" style={{ width: `${yW}%` }} />
        </div>
      </div>
    </div>
  )
}
