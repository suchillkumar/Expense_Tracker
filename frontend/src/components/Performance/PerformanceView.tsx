import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  benchmarkLatency,
  getLatencySamples,
  getLastVoiceLatencyMs,
  getVoiceAlertCount,
  isSpeechSupported,
  speak
} from '../../services/voiceService'

const EXCELLENT_MS = 500
const ACCEPTABLE_MS = 1500

function statusOf(latency: number): { label: string; color: string; bg: string } {
  if (latency < EXCELLENT_MS) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (latency < ACCEPTABLE_MS) return { label: 'Acceptable', color: 'text-amber-600', bg: 'bg-amber-50' }
  return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' }
}

export function PerformanceView() {
  const { user } = useAuth()
  const [latency, setLatency] = useState<number | null>(getLastVoiceLatencyMs())
  const [samples, setSamples] = useState<number[]>(() => getLatencySamples())
  const [alertCount, setAlertCount] = useState(() => getVoiceAlertCount())
  const [testing, setTesting] = useState(false)
  const [speechSupported] = useState(() => isSpeechSupported())
  const [backgroundOn, setBackgroundOn] = useState(true)

  const refresh = () => {
    setLatency(getLastVoiceLatencyMs())
    setSamples(getLatencySamples())
    setAlertCount(getVoiceAlertCount())
  }

  const runTest = async () => {
    setTesting(true)
    await speak('Voice latency test. Expense tracker is responding.')
    refresh()
    setTesting(false)
  }

  useEffect(() => { runTest() }, [])

  useEffect(() => {
    if (!backgroundOn) return
    const id = setInterval(async () => { await benchmarkLatency(0); refresh() }, 15000)
    return () => clearInterval(id)
  }, [backgroundOn, user])

  const valid = samples.filter((s) => s >= 0)
  const avg = valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
  const best = valid.length > 0 ? Math.min(...valid) : null
  const worst = valid.length > 0 ? Math.max(...valid) : null

  const chartWidth = 600
  const chartHeight = 180
  const padding = 8
  const maxLatency = Math.max(ACCEPTABLE_MS * 1.5, ...samples, 1)
  const barWidth = samples.length > 0 ? (chartWidth - padding * 2) / samples.length : 0
  const barColor = (value: number) => value < EXCELLENT_MS ? '#10b981' : value < ACCEPTABLE_MS ? '#f59e0b' : '#ef4444'

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">AI Performance</h2>
          <p className="page-subtitle">Voice processing latency — response time for AI voice alerts</p>
        </div>
        <button onClick={runTest} disabled={testing || !speechSupported} className="btn-primary">
          {testing ? 'Measuring...' : 'Run latency test'}
        </button>
      </div>

      {!speechSupported && (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200">
          Speech synthesis is not supported in this browser.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Current latency', value: latency == null ? '—' : latency < 0 ? 'Failed' : `${latency} ms`, sub: latency != null && latency >= 0 ? statusOf(latency).label : undefined, color: latency != null && latency >= 0 ? statusOf(latency).color : 'text-gray-400' },
          { label: 'Average latency', value: avg == null ? '—' : `${avg} ms`, color: 'text-gray-900' },
          { label: 'Best / worst', value: best == null ? '—' : `${best} / ${worst} ms`, color: 'text-gray-900' },
          { label: 'Voice alerts fired', value: String(alertCount), color: 'text-gray-900' },
        ].map((m) => (
          <div key={m.label} className="stat-card">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{m.label}</p>
            <p className={`mt-1.5 text-xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
            {m.sub && <p className={`text-xs font-medium mt-0.5 ${m.color}`}>{m.sub}</p>}
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="section-title text-sm">Latency history</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last {samples.length} measurements</p>
          </div>
          <button onClick={() => setBackgroundOn((v) => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${backgroundOn ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
            Background: {backgroundOn ? 'On' : 'Off'}
          </button>
        </div>

        {samples.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">⚡</span>
            </div>
            <p className="text-sm text-gray-500">No measurements yet. Run a latency test.</p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full">
            {[EXCELLENT_MS, ACCEPTABLE_MS].map((threshold, i) => {
              const y = chartHeight - padding - (threshold / maxLatency) * (chartHeight - padding * 2)
              return (
                <g key={threshold}>
                  <line x1={padding} x2={chartWidth - padding} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={chartWidth - padding - 2} y={y - 3} textAnchor="end" fontSize="10" fill="#9ca3af">
                    {threshold}ms {i === 0 ? 'target' : 'limit'}
                  </text>
                </g>
              )
            })}
            {samples.map((s, i) => {
              const h = (Math.max(s, 0) / maxLatency) * (chartHeight - padding * 2)
              const x = padding + i * barWidth
              return (
                <rect key={i} x={x + barWidth * 0.15} y={chartHeight - padding - h}
                  width={barWidth * 0.7} height={Math.max(h, 2)} rx={2} fill={barColor(s)}>
                  <title>{`${s} ms`}</title>
                </rect>
              )
            })}
          </svg>
        )}

        <div className="flex items-center gap-5 mt-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            &lt;{EXCELLENT_MS}ms excellent
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            &lt;{ACCEPTABLE_MS}ms acceptable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            &ge;{ACCEPTABLE_MS}ms poor
          </span>
        </div>
      </div>
    </div>
  )
}
