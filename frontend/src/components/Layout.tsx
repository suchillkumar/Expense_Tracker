import { ReactNode, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { useTheme } from '../context/ThemeContext'
import { Logo } from './Shared/Logo'

interface LayoutProps {
  children: ReactNode
  active: string
  onNavigate: (viewKey: string) => void
  onOpenAddTransaction?: (type?: 'income' | 'expense') => void
}

interface NavItem {
  key: string
  label: string
  icon: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Home', icon: '📊' },
  { key: 'transactions', label: 'Transactions', icon: '💸' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
  { key: 'goals', label: 'Savings Goals', icon: '🏆', badge: 'New' },
  { key: 'ai-assistant', label: 'AI Advisor', icon: '✨' },
  { key: 'reports', label: 'Statements', icon: '📑' },
  { key: 'profile', label: 'Profile & Settings', icon: '👤' },
]

export function Layout({ children, active, onNavigate, onOpenAddTransaction }: LayoutProps) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadNotificationCount, markNotificationsRead } = useExpense()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const sidebarW = collapsed ? 76 : 256

  const handleNavClick = (key: string) => {
    onNavigate(key)
    setMobileDrawerOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* ── Top Bar (Desktop & Mobile Header) ── */}
      <header className="h-16 bg-white/85 dark:bg-[#0B1120]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between transition-colors">
        {/* Left: Hamburger (Mobile) & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open navigation drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Logo size="sm" lightText={isDark} />
        </div>

        {/* Right: Quick Action, Notifications, Theme, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Desktop Quick + Add Button */}
          {onOpenAddTransaction && (
            <button
              onClick={() => onOpenAddTransaction('expense')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>+</span>
              <span>Add Transaction</span>
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifPanelOpen(!notifPanelOpen)
                if (!notifPanelOpen) markNotificationsRead()
              }}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
            >
              <span className="text-base">🔔</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {notifPanelOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#111827] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-fade-in">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Notifications</span>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                      {notifications.length}
                    </span>
                  </h4>
                  <button
                    onClick={() => setNotifPanelOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                      <span>✨ All caught up! No unread alerts.</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 flex items-start gap-2.5 transition-colors ${
                          !n.read ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                        }`}
                      >
                        <span className="text-sm shrink-0 mt-0.5">
                          {n.type === 'warning' ? '⚠️' : n.type === 'alert' ? '🔴' : 'ℹ️'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white leading-snug">
                            {n.title || n.message}
                          </p>
                          {n.title && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>}
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all text-xs font-semibold cursor-pointer"
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
            <span className="hidden md:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">
                {user?.name?.split(' ')[0] || 'Account'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                {user?.preferredCurrency || 'INR'}
              </p>
            </div>
          </button>
        </div>
      </header>

      {/* ── Main Body ── */}
      <div className="flex flex-1 relative">
        {/* Desktop Sidebar Navigation */}
        <aside
          style={{ width: `${sidebarW}px` }}
          className="hidden lg:flex flex-col justify-between bg-white dark:bg-[#0B1120] border-r border-slate-200/80 dark:border-slate-800/80 sticky top-16 h-[calc(100vh-4rem)] p-3.5 transition-all duration-200 z-30"
        >
          {/* Nav Items List */}
          <div className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-xs border border-blue-200/80 dark:border-blue-800/80'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className={`text-base shrink-0 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                  {!collapsed && isActive && !item.badge && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Bottom Actions: Collapse Toggle & Logout */}
          <div className="space-y-1 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-sm">{collapsed ? '→' : '←'}</span>
              {!collapsed && <span>Collapse Sidebar</span>}
            </button>

            <button
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <span className="text-base shrink-0">🚪</span>
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* ── Main Content Container ── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-28 lg:pb-12">
          {children}
        </main>
      </div>

      {/* ── Fixed Mobile Bottom Navigation Bar (5 Primary Destinations) ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-18 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-around px-3 z-40 shadow-lg pb-safe">
        {/* 1. Home */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            active === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-semibold mt-0.5">Home</span>
        </button>

        {/* 2. Transactions */}
        <button
          onClick={() => handleNavClick('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            active === 'transactions'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span className="text-xl">💸</span>
          <span className="text-[10px] font-semibold mt-0.5">Activity</span>
        </button>

        {/* 3. Central Prominent Floating "+" Button */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => onOpenAddTransaction ? onOpenAddTransaction('expense') : onNavigate('transactions')}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center text-2xl font-bold -translate-y-4 border-4 border-white dark:border-[#0B1120] active:scale-90 transition-transform cursor-pointer"
            aria-label="Add Transaction"
            title="Add Transaction"
          >
            +
          </button>
        </div>

        {/* 4. Budgets */}
        <button
          onClick={() => handleNavClick('budgets')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            active === 'budgets'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span className="text-xl">🎯</span>
          <span className="text-[10px] font-semibold mt-0.5">Budgets</span>
        </button>

        {/* 5. Analytics */}
        <button
          onClick={() => handleNavClick('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            active === 'analytics'
              ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
          }`}
        >
          <span className="text-xl">📈</span>
          <span className="text-[10px] font-semibold mt-0.5">Analytics</span>
        </button>
      </nav>

      {/* ── Mobile Side Navigation Drawer (Full Menu) ── */}
      {mobileDrawerOpen && (
        <div
          onClick={() => setMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 max-w-[85vw] h-full bg-white dark:bg-[#0B1120] shadow-2xl p-5 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800"
          >
            <div>
              {/* Drawer Brand Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                <Logo size="md" lightText={isDark} />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Items */}
              <div className="space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const isActive = active === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavClick(item.key)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false)
                  setLogoutModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <span className="text-base">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Confirmation Dialog ── */}
      {logoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-3xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl mb-4">
              🚪
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign Out of Expense Tracker?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Your financial records remain safely encrypted. You can sign back in at any time.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-6">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setLogoutModalOpen(false)
                  logout()
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-500/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
