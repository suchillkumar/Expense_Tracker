import { useState, useMemo } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { formatDate } from '../../utils/format'

export function NotificationsView() {
  const { notifications, markNotificationsRead, notify } = useExpense()
  const [filter, setFilter] = useState<'all' | 'unread' | 'alert' | 'warning' | 'info'>('all')

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const visible = useMemo(() => {
    let list = [...notifications]
    if (filter === 'unread') list = list.filter(n => !n.read)
    else if (filter !== 'all') list = list.filter(n => n.type === filter)
    return list
  }, [notifications, filter])

  const typeStyles: Record<string, { bg: string; border: string; text: string; icon: string; label: string }> = {
    alert: { bg: 'bg-red-50/70', border: 'border-red-200', text: 'text-red-700', icon: '🚨', label: 'Critical Alert' },
    warning: { bg: 'bg-amber-50/70', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠️', label: 'Budget Warning' },
    info: { bg: 'bg-sky-50/70', border: 'border-sky-200', text: 'text-sky-700', icon: '💡', label: 'Smart Insight' },
  }

  const triggerTestAlert = () => {
    notify('🔔 Smart Alert: You have reached 82% of your Food & Dining budget limit.', 'warning')
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications & Alerts</h2>
          <p className="text-xs text-gray-500 mt-1">
            Real-time financial telemetry, threshold crossings, bill reminders, and n8n dispatches
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerTestAlert}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
          >
            ⚡ Test Notification
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markNotificationsRead}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              Mark all as read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('alert')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'alert' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🚨 Critical Alerts
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'warning' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚠️ Warnings
        </button>
        <button
          onClick={() => setFilter('info')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'info' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💡 Insights
        </button>
      </div>

      {/* Notifications List */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200/80 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
            🔔
          </div>
          <h4 className="text-sm font-bold text-gray-900">You're all caught up!</h4>
          <p className="text-xs text-gray-400 mt-1">No notifications match your current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => {
            const style = typeStyles[n.type] ?? typeStyles.info
            return (
              <div
                key={n.id}
                className={`bg-white rounded-3xl border p-5 transition-all shadow-xs flex items-start gap-4 ${
                  !n.read ? 'border-sky-300 ring-2 ring-sky-100' : 'border-gray-200/80 opacity-75'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl ${style.bg} border ${style.border} flex items-center justify-center text-lg shrink-0`}>
                  {style.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                    {!n.read && (
                      <span className="text-[10px] bg-sky-600 text-white font-bold px-2 py-0.5 rounded-full">
                        NEW
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(n.date)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-relaxed mt-1">{n.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
