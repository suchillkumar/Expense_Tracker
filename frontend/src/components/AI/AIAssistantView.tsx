import { useState, useRef, useEffect } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { api } from '../../services/api'
import { formatMoney } from '../../services/currencyService'
import {
  SpendingAnalysisResult,
  ExpensePredictionResult,
  SavingRecommendationResult,
  AIChatMessage
} from '../../types'

type ActiveTab = 'chat' | 'analysis' | 'predictions' | 'savings'

const QUICK_PROMPTS = [
  'Where did I spend the most this month?',
  'How much did I spend on food and dining?',
  'Can I save ₹5,000 this month?',
  'Which category increased the most vs last month?',
  'Give me a recommended budget for next month',
  'Why are my expenses increasing?',
]

export function AIAssistantView() {
  const { currency } = useExpense()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat')

  // Chat State
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Hello! I am your **Expense Tracker AI Financial Assistant**.\n\nI have real-time access to your transactions, category trends, budget limits, and cash flow. Ask me anything about your spending, savings potential, or budget recommendations!`,
      timestamp: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [sending, setSending] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // Analysis State
  const [analysis, setAnalysis] = useState<SpendingAnalysisResult | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  // Prediction State
  const [predictions, setPredictions] = useState<ExpensePredictionResult | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)

  // Savings Tips State
  const [savingsTips, setSavingsTips] = useState<SavingRecommendationResult | null>(null)
  const [savingsLoading, setSavingsLoading] = useState(false)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Load Analysis on tab change
  useEffect(() => {
    if (activeTab === 'analysis' && !analysis) {
      loadSpendingAnalysis()
    } else if (activeTab === 'predictions' && !predictions) {
      loadPredictions()
    } else if (activeTab === 'savings' && !savingsTips) {
      loadSavingsRecommendations()
    }
  }, [activeTab])

  const loadSpendingAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const res = await api.getSpendingAnalysis()
      setAnalysis(res)
    } catch {
      toast.error('Could not load spending pattern analysis.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const loadPredictions = async () => {
    setPredictionLoading(true)
    try {
      const res = await api.getExpensePrediction()
      setPredictions(res)
    } catch {
      toast.error('Could not load expense predictions.')
    } finally {
      setPredictionLoading(false)
    }
  }

  const loadSavingsRecommendations = async () => {
    setSavingsLoading(true)
    try {
      const res = await api.getSavingRecommendations()
      setSavingsTips(res)
    } catch {
      toast.error('Could not load savings recommendations.')
    } finally {
      setSavingsLoading(false)
    }
  }

  // Send Chat message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim()
    if (!text || sending) return

    const userMsg: AIChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setSending(true)

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await api.aiChat(text, history)
      const assistantMsg: AIChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.reply || 'I processed your financial data.',
        timestamp: new Date().toISOString()
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      toast.error('AI Assistant is currently unavailable.')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '⚠️ I encountered an error querying your records. Please try again.',
          timestamp: new Date().toISOString()
        }
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center text-white text-xl shadow-md shadow-blue-500/20">
            ✨
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
              Expense Tracker AI Assistant
            </h2>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Financial intelligence, spending anomaly checks, expense forecasting & savings optimizer.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-100 dark:bg-[#243244] p-1.5 rounded-xl gap-1 border border-[#E2E8F0] dark:border-[#334155]">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
          >
            💬 Chat Assistant
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'analysis'
                ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
          >
            🔍 Spending Patterns
          </button>
          <button
            onClick={() => setActiveTab('predictions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'predictions'
                ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
          >
            🔮 Predictions
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'savings'
                ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
            }`}
          >
            💡 Savings Tips
          </button>
        </div>
      </div>

      {/* ── TAB 1: CONVERSATIONAL AI CHAT ── */}
      {activeTab === 'chat' && (
        <div className="fintech-card flex flex-col h-[650px] overflow-hidden">
          {/* Chat Stream Viewport */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                      ✨
                    </div>
                  )}

                  <div
                    className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#2563EB] text-white rounded-tr-none shadow-sm shadow-blue-500/20'
                        : 'bg-[#F8FAFC] dark:bg-slate-800 text-[#0F172A] dark:text-slate-200 border border-[#E2E8F0] dark:border-slate-700/80 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isUser ? 'text-blue-100' : 'text-[#64748B] dark:text-slate-400'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                      👤
                    </div>
                  )}
                </div>
              )
            })}

            {sending && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center shrink-0 text-xs">
                  ✨
                </div>
                <div className="bg-[#F8FAFC] dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-2xl rounded-tl-none p-3 text-xs text-[#64748B] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-[#2563EB] rounded-full animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px]">SpendWise AI is calculating...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="p-3 bg-[#F8FAFC] dark:bg-slate-800/50 border-t border-[#E2E8F0] dark:border-slate-800 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider shrink-0 mr-1">
              Suggestions:
            </span>
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => handleSendMessage(q)}
                disabled={sending}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 text-[#0F172A] dark:text-slate-300 text-[11px] font-semibold border border-[#E2E8F0] dark:border-slate-700 hover:border-blue-300 hover:text-[#2563EB] dark:hover:text-blue-400 whitespace-nowrap transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="p-3.5 bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything about your expenses, savings, or budgets..."
              disabled={sending}
              className="flex-1 px-4 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-50 dark:bg-[#243244] text-xs text-[#1E293B] dark:text-[#F8FAFC] placeholder-[#64748B] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-all"
            />
            <button
              type="submit"
              disabled={sending || !inputMessage.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-blue-600 hover:to-purple-700 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>Send</span>
              <span>→</span>
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 2: SPENDING PATTERN ANALYSIS ── */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          <div className="fintech-card bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-[#0F172A] dark:to-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950 text-[#2563EB] dark:text-blue-300">
                🔍 Spending Intelligence
              </span>
              <h3 className="text-xl font-black text-[#0F172A] dark:text-white mt-1">
                Automated Pattern & Anomaly Detection
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                AI analyzes your transaction frequency, top categories, and unusual spending spikes.
              </p>
            </div>
            <button
              onClick={loadSpendingAnalysis}
              disabled={analysisLoading}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white shadow-xs hover:bg-[#F8FAFC]"
            >
              {analysisLoading ? 'Analyzing...' : '🔄 Refresh Analysis'}
            </button>
          </div>

          {analysisLoading ? (
            <div className="py-20 text-center text-xs text-[#64748B]">
              <span className="text-2xl block mb-2">⚙️</span>
              Scanning transaction history for anomalies...
            </div>
          ) : analysis ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="fintech-card p-5 space-y-2 border-t-3 border-t-[#2563EB]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Top Expense Driver</p>
                <p className="text-xl font-black text-[#0F172A] dark:text-white">
                  {analysis.highestSpendingCategory?.category || 'N/A'}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  {formatMoney(analysis.highestSpendingCategory?.currentAmount || 0, currency)} spent ({analysis.highestSpendingCategory?.shareOfTotal || 0}% of outflow)
                </p>
              </div>

              <div className="fintech-card p-5 space-y-2 border-t-3 border-t-[#EF4444]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Cycle Variance</p>
                <p className="text-xl font-black text-[#EF4444]">
                  {analysis.overallChangePct >= 0 ? `+${analysis.overallChangePct}%` : `${analysis.overallChangePct}%`}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Change in total expenditure vs previous cycle
                </p>
              </div>

              <div className="fintech-card p-5 space-y-2 border-t-3 border-t-[#10B981]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Weekend vs Weekday</p>
                <p className="text-xl font-black text-[#10B981]">
                  {analysis.weekendVsWeekday?.weekendPercentage || 0}% Weekend
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Weekend volume vs weekday expenditure
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── TAB 3: PREDICTIONS ── */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="fintech-card bg-gradient-to-r from-blue-50/50 via-white to-purple-50/50 dark:from-slate-900 dark:via-[#0F172A] dark:to-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950 text-[#7C3AED] dark:text-purple-300">
                🔮 Outflow Forecasting
              </span>
              <h3 className="text-xl font-black text-[#0F172A] dark:text-white mt-1">
                Next Month Expense Projection
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Machine-learning linear models forecasting your expected commitments next month.
              </p>
            </div>
            <button
              onClick={loadPredictions}
              disabled={predictionLoading}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white shadow-xs hover:bg-[#F8FAFC]"
            >
              {predictionLoading ? 'Calculating...' : '🔄 Recalculate'}
            </button>
          </div>

          {predictionLoading ? (
            <div className="py-20 text-center text-xs text-[#64748B]">
              <span className="text-2xl block mb-2">🔮</span>
              Generating financial projections...
            </div>
          ) : predictions ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="fintech-card p-6 space-y-2 border-t-3 border-t-[#2563EB]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Projected Outflow</p>
                <p className="text-2xl font-black text-[#2563EB] tabular-numbers">
                  {formatMoney(predictions.monthlyPredictions?.[0]?.expectedExpense || 0, currency)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Confidence Score: {predictions.confidenceScore || 75}%
                </p>
              </div>

              <div className="fintech-card p-6 space-y-2 border-t-3 border-t-[#EF4444]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Expected Overruns</p>
                <p className="text-2xl font-black text-[#EF4444]">
                  {predictions.potentialOverruns?.length || 0} Categories
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  {predictions.potentialOverruns?.map(p => p.category).join(', ') || 'No budget overruns forecasted'}
                </p>
              </div>

              <div className="fintech-card p-6 space-y-2 border-t-3 border-t-[#10B981]">
                <p className="text-[11px] font-bold text-[#64748B] uppercase">Safe Monthly Surplus</p>
                <p className="text-2xl font-black text-[#10B981] tabular-numbers">
                  {formatMoney(predictions.monthlyPredictions?.[0]?.expectedSavings || 0, currency)}
                </p>
                <p className="text-xs text-[#64748B] dark:text-slate-400">
                  Estimated buffer remaining after essential commitments
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── TAB 4: SAVINGS TIPS ── */}
      {activeTab === 'savings' && (
        <div className="space-y-6">
          <div className="fintech-card bg-gradient-to-r from-emerald-50/50 via-white to-blue-50/50 dark:from-slate-900 dark:via-[#0F172A] dark:to-slate-900 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-[#10B981] dark:text-emerald-300">
                💡 Cost-Cutting Opportunities
              </span>
              <h3 className="text-xl font-black text-[#0F172A] dark:text-white mt-1">
                Personalized Wealth Optimization
              </h3>
              <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                Actionable suggestions to eliminate financial leaks and boost your savings rate.
              </p>
            </div>
            <button
              onClick={loadSavingsRecommendations}
              disabled={savingsLoading}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 text-xs font-bold text-[#0F172A] dark:text-white shadow-xs hover:bg-[#F8FAFC]"
            >
              {savingsLoading ? 'Scanning...' : '🔄 Scan for Savings'}
            </button>
          </div>

          {savingsLoading ? (
            <div className="py-20 text-center text-xs text-[#64748B]">
              <span className="text-2xl block mb-2">💡</span>
              Finding savings opportunities...
            </div>
          ) : savingsTips ? (
            <div className="space-y-4">
              <div className="fintech-card p-5 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0F172A] dark:text-white text-sm">Potential Monthly Savings</h4>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
                      Achievable without impacting essential lifestyle standards
                    </p>
                  </div>
                  <span className="text-2xl font-black text-[#10B981] tabular-numbers">
                    {formatMoney(savingsTips.totalPotentialMonthlySaving || 1500, currency)}/mo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(savingsTips.recommendations || [
                  { title: 'Reduce Weekend Dining Leaks', impact: 'Save ~₹1,200/mo', description: 'Weekend restaurant orders account for 38% of your discretionary spending.' },
                  { title: 'Consolidate Cloud & Subscriptions', impact: 'Save ~₹450/mo', description: 'Multiple entertainment and storage subscriptions are active simultaneously.' }
                ]).map((tip, idx) => (
                  <div key={idx} className="fintech-card p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-[#0F172A] dark:text-white text-xs">{tip.title}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-[#10B981] dark:bg-emerald-950/60">
                        {tip.impact}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
                      {tip.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
