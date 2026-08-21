import { useEffect, useState } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { useAuth } from '../../context/AuthContext'
import { formatDateShort } from '../../utils/format'

export function NotificationBell() {
  const { notifications, markNotificationsRead } = useExpense()
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (!user) setOpen(false)
  }, [user])

  if (!user) return null

  const typeStyles: Record<string, { bg: string; text: string; icon: string }> = {
    alert: { bg: 'bg-red-50', text: 'text-red-700', icon: '🚨' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', icon: '⚠️' },
    info: { bg: 'bg-sky-50', text: 'text-sky-700', icon: '💡' },
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((o) => !o)
          if (!open && unread > 0) markNotificationsRead()
        }}
        className="topbar-btn relative"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341c-2.326.573-4 2.657-4 5.159v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white animate-bounce-in">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden bg-white rounded-xl shadow-xl border border-gray-200 z-30 animate-fade-in-down">
            <div className="flex items-center justify-between px-4 py-3 divider">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unread > 0 && (
                <span className="badge bg-sky-100 text-sky-700">{unread} new</span>
              )}
            </div>
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <span className="text-xl">🔔</span>
                  </div>
                  <p className="text-sm text-gray-500">You're all caught up</p>
                  <p className="text-xs text-gray-400 mt-0.5">No notifications yet</p>
                </div>
              ) : (
                notifications.slice(0, 15).map((n) => {
                  const style = typeStyles[n.type] || typeStyles.info
                  return (
                    <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${!n.read ? 'bg-sky-50/30' : ''}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-sm shrink-0 mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{formatDateShort(n.date)}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
