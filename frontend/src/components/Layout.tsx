import { ReactNode, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useExpense } from '../context/ExpenseContext'
import { useTheme } from '../context/ThemeContext'
import { Logo } from './Shared/Logo'

interface LayoutProps {
  children: ReactNode
  active: string
  onNavigate: (viewKey: string) => void
}

interface NavItem {
  key: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'transactions', label: 'Transactions', icon: '💸' },
  { key: 'budgets', label: 'Budgets', icon: '🎯' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
  { key: 'ai-assistant', label: 'AI Assistant', icon: '✨' },
  { key: 'reports', label: 'Reports', icon: '📑' },
  { key: 'profile', label: 'Profile', icon: '👤' },
]

export function Layout({ children, active, onNavigate }: LayoutProps) {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { notifications, unreadNotificationCount, markNotificationsRead } = useExpense()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const sidebarW = collapsed ? 76 : 256

  const handleNavClick = (key: string) => {
    onNavigate(key)
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#090D16] text-[#0F172A] dark:text-[#FFFFFF] flex flex-col selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Top Bar for Desktop and Mobile */}
      <header className="h-16 bg-white dark:bg-[#090D16] border-b border-[#E2E8F0] dark:border-[#1F2937] sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between transition-colors">
        {/* Left Side: Mobile Menu Button & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-xl text-[#64748B] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Logo size="sm" />
        </div>

        {/* Right Side: Notification Bell, Theme Switcher, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Bell with Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setNotifPanelOpen(!notifPanelOpen)
                if (!notifPanelOpen) markNotificationsRead()
              }}
              className="relative p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
              title="Notifications"
            >
              <span className="text-base">🔔</span>
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#DC2626] dark:bg-[#F87171] text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {notifPanelOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1E293B] rounded-2xl shadow-xl border border-[#E2E8F0] dark:border-[#334155] py-3 z-50 animate-fade-in">
                <div className="flex items-center justify-between px-4 pb-2 border-b border-[#E2E8F0] dark:border-[#334155]">
                  <h4 className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] flex items-center gap-1.5">
                    <span>Notifications</span>
                    <span className="text-[11px] bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] px-1.5 py-0.5 rounded-full font-medium">
                      {notifications.length}
                    </span>
                  </h4>
                  <button
                    onClick={() => setNotifPanelOpen(false)}
                    className="text-xs text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#E2E8F0] dark:divide-[#334155]">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                      <span>✨ All caught up! No new alerts.</span>
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
                          <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] leading-snug">
                            {n.title || n.message}
                          </p>
                          {n.title && <p className="text-[12px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">{n.message}</p>}
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-1 block">
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

          {/* Dark / Light Mode Toggle Pill */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-slate-100 hover:bg-slate-200 dark:bg-[#1E293B] dark:hover:bg-[#334155] text-[#1E293B] dark:text-[#F8FAFC] shadow-xs transition-all text-xs font-medium"
            title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            <span className="text-sm">{isDark ? '☀️' : '🌙'}</span>
            <span className="hidden sm:inline text-xs font-medium">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Profile Pill */}
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors border border-[#E2E8F0] dark:border-[#334155] text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden sm:block leading-none">
              <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F8FAFC] truncate max-w-[100px]">
                {user?.name || 'My Account'}
              </p>
              <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                {user?.preferredCurrency || 'INR'}
              </p>
            </div>
          </button>
        </div>
      </header>

      {/* Main Body Layout with Sidebar */}
      <div className="flex flex-1 relative">
        {/* Desktop Sidebar */}
        <aside
          style={{ width: `${sidebarW}px` }}
          className="hidden lg:flex flex-col justify-between bg-white dark:bg-[#090D16] border-r border-[#E2E8F0] dark:border-[#1F2937] sticky top-16 h-[calc(100vh-4rem)] p-3.5 transition-all duration-200 z-30"
        >
          {/* Nav List */}
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-100 text-[#0F172A] dark:bg-[#1E293B] dark:text-[#FFFFFF] font-semibold shadow-xs border-l-3 border-[#0F172A] dark:border-[#3B82F6]'
                      : 'text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#FFFFFF] hover:bg-slate-50 dark:hover:bg-[#1E293B]'
                  }`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              )
            })}
          </div>

          {/* Bottom Actions: Collapse Toggle & Logout */}
          <div className="space-y-1 pt-3 border-t border-[#E2E8F0] dark:border-[#1F2937]">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition-colors"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-sm">{collapsed ? '→' : '←'}</span>
              {!collapsed && <span>Collapse Sidebar</span>}
            </button>

            <button
              onClick={() => setLogoutModalOpen(true)}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <span className="text-base shrink-0">🚪</span>
              {!collapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* Mobile Navigation Drawer Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-72 max-w-[80vw] h-full bg-white dark:bg-[#090D16] shadow-2xl p-5 flex flex-col justify-between border-r border-[#E2E8F0] dark:border-[#1F2937]"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] dark:border-[#1F2937] mb-4">
                  <Logo size="md" />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-[#64748B] hover:bg-slate-100 dark:hover:bg-[#1E293B]"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = active === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleNavClick(item.key)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50 text-[#2563EB] dark:bg-blue-950/50 dark:text-[#60A5FA] font-semibold'
                            : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1E293B]'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#334155]">
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    setLogoutModalOpen(true)
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#DC2626] dark:text-[#F87171] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <span className="text-base">🚪</span>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-20 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-[#111827] border-t border-[#E2E8F0] dark:border-[#334155] flex items-center justify-around px-2 z-40 shadow-lg">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = active === item.key
          return (
            <button
              key={item.key}
              onClick={() => handleNavClick(item.key)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-[#2563EB] dark:text-[#60A5FA] font-semibold'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B]'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[11px] font-medium mt-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Logout Confirmation Modal Dialog */}
      {logoutModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 max-w-sm w-full border border-[#E2E8F0] dark:border-[#334155] shadow-2xl animate-fade-in-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#DC2626] dark:text-[#F87171] flex items-center justify-center text-xl mb-4">
              🚪
            </div>
            <h3 className="text-base font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Sign Out of Expense Tracker?</h3>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1.5 leading-relaxed font-normal">
              Your financial session will be safely closed. You can sign back in at any time.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-6">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="py-2.5 px-4 rounded-xl border border-[#E2E8F0] dark:border-[#334155] text-sm font-medium text-[#64748B] dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#243244] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setLogoutModalOpen(false)
                  logout()
                }}
                className="py-2.5 px-4 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white text-sm font-medium shadow-md shadow-red-500/20 transition-all"
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
