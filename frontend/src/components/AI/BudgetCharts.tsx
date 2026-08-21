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

interface BarData { label: string; recommended: number; current: number }

export function BarChart({ data, width = 500, height = 220 }: { data: BarData[]; width?: number; height?: number }) {
  if (data.length === 0) return null

  const maxVal = Math.max(...data.flatMap(d => [d.recommended, d.current]), 1)
  const padding = { top: 20, right: 10, bottom: 40, left: 10 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const groupW = chartW / data.length
  const barW = groupW * 0.3

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#e5e7eb" strokeWidth="1" />
      {data.map((d, i) => {
        const x = padding.left + i * groupW + groupW * 0.15
        const rH = (d.recommended / maxVal) * chartH
        const cH = (d.current / maxVal) * chartH
        return (
          <g key={i}>
            <rect x={x} y={padding.top + chartH - rH} width={barW} height={rH} rx="3" fill="#0ea5e9" opacity="0.8" />
            <rect x={x + barW + 3} y={padding.top + chartH - cH} width={barW} height={cH} rx="3" fill="#f97316" opacity="0.8" />
            <text x={x + barW} y={height - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">{d.label}</text>
          </g>
        )
      })}
      <circle cx={width - 80} cy={12} r="4" fill="#0ea5e9" />
      <text x={width - 72} y={16} fontSize="10" fill="#6b7280">Recommended</text>
      <circle cx={width - 80} cy={26} r="4" fill="#f97316" />
      <text x={width - 72} y={30} fontSize="10" fill="#6b7280">Current</text>
    </svg>
  )
}

interface TrendData { month: string; income: number; expense: number }

export function LineChart({ data, width = 500, height = 200 }: { data: TrendData[]; width?: number; height?: number }) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
        Need at least 2 months of data for trend chart
      </div>
    )
  }

  const allVals = data.flatMap(d => [d.income, d.expense])
  const maxVal = Math.max(...allVals, 1)
  const padding = { top: 20, right: 20, bottom: 40, left: 20 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const toX = (i: number) => padding.left + (i / (data.length - 1)) * chartW
  const toY = (v: number) => padding.top + chartH - (v / maxVal) * chartH

  const incomePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.income)}`).join(' ')
  const expensePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.expense)}`).join(' ')

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke="#e5e7eb" strokeWidth="1" />
      <path d={incomePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.income)} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
          <circle cx={toX(i)} cy={toY(d.expense)} r="3.5" fill="#ef4444" stroke="white" strokeWidth="1.5" />
          <text x={toX(i)} y={height - 8} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {d.month.slice(5)}
          </text>
        </g>
      ))}
      <line x1={width - 100} y1={10} x2={width - 88} y2={10} stroke="#10b981" strokeWidth="2.5" />
      <text x={width - 84} y={14} fontSize="10" fill="#6b7280">Income</text>
      <line x1={width - 100} y1={26} x2={width - 88} y2={26} stroke="#ef4444" strokeWidth="2.5" />
      <text x={width - 84} y={30} fontSize="10" fill="#6b7280">Expenses</text>
    </svg>
  )
}

export function SavingsCompareChart({ monthly, yearly }: { monthly: number; yearly: number }) {
  const max = Math.max(yearly, 1)
  const mW = (monthly / max) * 100
  const yW = 100

  return (
    <div className="space-y-4">
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Monthly Savings</span>
          <span className="font-semibold text-emerald-600">Rs. {monthly.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all" style={{ width: `${mW}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-gray-500">Yearly Savings</span>
          <span className="font-semibold text-sky-600">Rs. {yearly.toLocaleString('en-IN')}</span>
        </div>
        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 rounded-full transition-all" style={{ width: `${yW}%` }} />
        </div>
      </div>
    </div>
  )
}
