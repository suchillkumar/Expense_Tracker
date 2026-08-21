import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useExpense } from '../../context/ExpenseContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../context/ToastContext'
import { CURRENCIES } from '../../types'
import { initials } from '../../utils/format'

const AVATARS = ['👨‍💼', '👩‍💼', '🧑‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓', '🧑‍🎨', '👩‍🔬', '🧙‍♂️', '🦁', '🚀', '🌟']

const FINANCIAL_GOALS = [
  'Build an Emergency Fund',
  'Pay Off Debt / Loans',
  'Save for a Dream Home',
  'Grow Long-term Investments',
  'Travel & Vacation Fund',
  'Save for Higher Education',
  'Retirement Planning',
  'General Financial Freedom'
]

export function ProfileView() {
  const { user, updateProfile, changePassword, logout } = useAuth()
  const { loadDemoData } = useExpense()
  const { theme, setTheme } = useTheme()
  const toast = useToast()

  const [tab, setTab] = useState<'personal' | 'financial' | 'theme' | 'security'>('personal')

  // Personal Info Form
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || AVATARS[0])
  const [age, setAge] = useState<number | ''>(user?.age || '')
  const [occupation, setOccupation] = useState(user?.occupation || '')

  // Financial Info Form
  const [monthlyIncome, setMonthlyIncome] = useState<number | ''>(user?.monthlyIncome || '')
  const [currency, setCurrency] = useState(user?.preferredCurrency || 'INR')
  const [financialGoal, setFinancialGoal] = useState(user?.financialGoal || FINANCIAL_GOALS[0])
  const [budgetPeriod, setBudgetPeriod] = useState(user?.preferredBudgetPeriod || 'monthly')

  // Security Form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        name,
        email,
        phone,
        avatarUrl,
        age: age === '' ? undefined : Number(age),
        occupation,
      })
      toast.success('Personal profile updated successfully!')
    } catch {
      toast.error('Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveFinancial = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await updateProfile({
        monthlyIncome: monthlyIncome === '' ? undefined : Number(monthlyIncome),
        preferredCurrency: currency,
        financialGoal,
        preferredBudgetPeriod: budgetPeriod as 'monthly' | 'yearly',
      })
      toast.success('Financial preferences updated!')
    } catch {
      toast.error('Failed to update financial settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Failed to change password. Verify your current password.')
    } finally {
      setSaving(false)
    }
  }

  const handleLoadDemo = async () => {
    setDemoLoading(true)
    try {
      await loadDemoData()
      toast.success('Rich sample transactions and budgets loaded!')
    } catch {
      toast.error('Could not load demo data.')
    } finally {
      setDemoLoading(false)
    }
  }

  const inputClass =
    'w-full px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-sm font-normal text-[#1E293B] dark:text-[#F8FAFC] focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-all'

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl mx-auto">
      {/* 1. Header Profile Banner */}
      <div className="fintech-card p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20 shrink-0 font-bold">
            {avatarUrl || initials(user?.name || 'User')}
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] dark:text-[#F8FAFC]">
              {user?.name || 'Member'}
            </h2>
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
              {user?.email} • {user?.occupation || 'Finance Enthusiast'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA]">
                Verified Account
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/60 text-[#16A34A] dark:text-[#22C55E]">
                {user?.preferredCurrency || 'INR'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-[#DC2626] dark:text-[#F87171] hover:bg-red-100 text-sm font-medium transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* 2. Form Tabs */}
      <div className="flex items-center bg-slate-100 dark:bg-[#243244] p-1.5 rounded-xl gap-1 max-w-xl border border-[#E2E8F0] dark:border-[#334155]">
        <button
          onClick={() => setTab('personal')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'personal'
              ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs font-semibold'
              : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setTab('financial')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'financial'
              ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs font-semibold'
              : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Financial
        </button>
        <button
          onClick={() => setTab('theme')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'theme'
              ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs font-semibold'
              : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Theme & Display
        </button>
        <button
          onClick={() => setTab('security')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === 'security'
              ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs font-semibold'
              : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
          }`}
        >
          Security
        </button>
      </div>

      {/* TAB 1: Personal Details */}
      {tab === 'personal' && (
        <form onSubmit={handleSavePersonal} className="fintech-card p-6 sm:p-8 space-y-6">
          {/* Avatar Picker */}
          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-2">Choose Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setAvatarUrl(av)}
                  className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition-all ${
                    avatarUrl === av
                      ? 'bg-blue-100 dark:bg-blue-950 border-2 border-[#2563EB] scale-105'
                      : 'bg-[#F8FAFC] dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Email Address *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Age</label>
              <input
                type="number"
                min="16"
                max="100"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="28"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Occupation / Profession</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Software Engineer, Consultant, Student..."
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-sm font-medium shadow-xs disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Financial Preferences */}
      {tab === 'financial' && (
        <form onSubmit={handleSaveFinancial} className="fintech-card p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Preferred Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClass}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Monthly Salary / Income ({currency})</label>
              <input
                type="number"
                min="0"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="e.g. 75000"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Preferred Budget Period</label>
              <select
                value={budgetPeriod}
                onChange={(e) => setBudgetPeriod(e.target.value)}
                className={inputClass}
              >
                <option value="monthly">Monthly Cycle</option>
                <option value="yearly">Yearly Cycle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Primary Financial Milestone</label>
              <select
                value={financialGoal}
                onChange={(e) => setFinancialGoal(e.target.value)}
                className={inputClass}
              >
                {FINANCIAL_GOALS.map((g) => (
                  <option key={g} value={g}>
                    🎯 {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Demo Data Loader Section */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#334155] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Developer Testing & Exploration</h4>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">Load sample salary deposits, rent, groceries, and budget limits.</p>
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-[#60A5FA] hover:bg-blue-100 dark:hover:bg-blue-900/40 text-sm font-medium transition-all"
            >
              {demoLoading ? 'Loading Sample Data...' : '🚀 Load Demo Data'}
            </button>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-sm font-medium shadow-xs disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving changes...' : 'Save Financial Profile'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Theme & Display Preferences */}
      {tab === 'theme' && (
        <div className="fintech-card p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-base font-bold text-[#0F172A] dark:text-white">Theme & Display Settings</h3>
            <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
              Customize the visual appearance of your dashboard and interface.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Light Mode Card */}
            <div
              onClick={() => setTheme('light')}
              className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-3 ${
                theme === 'light'
                  ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#243244]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">☀️</span>
                {theme === 'light' && (
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Light Theme</h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
                  Soft, comfortable slate & white aesthetic.
                </p>
              </div>
              <div className="h-10 rounded-xl bg-white border border-[#E2E8F0] p-2 flex items-center gap-1.5 shadow-xs">
                <div className="w-4 h-4 rounded-md bg-[#2563EB]" />
                <div className="w-12 h-2 rounded bg-slate-200" />
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={() => setTheme('dark')}
              className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-3 ${
                theme === 'dark'
                  ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#243244]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">🌙</span>
                {theme === 'dark' && (
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Dark Theme</h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
                  Comfortable deep slate tone easy on the eyes and high contrast.
                </p>
              </div>
              <div className="h-10 rounded-xl bg-[#1E293B] border border-[#334155] p-2 flex items-center gap-1.5 shadow-xs">
                <div className="w-4 h-4 rounded-md bg-[#3B82F6]" />
                <div className="w-12 h-2 rounded bg-slate-700" />
              </div>
            </div>

            {/* System Default Card */}
            <div
              onClick={() => setTheme('system')}
              className={`cursor-pointer p-5 rounded-2xl border-2 transition-all space-y-3 ${
                theme === 'system'
                  ? 'border-[#2563EB] bg-blue-50/50 dark:bg-blue-950/40 shadow-sm'
                  : 'border-[#E2E8F0] dark:border-[#334155] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#243244]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">💻</span>
                {theme === 'system' && (
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1E293B] dark:text-[#F8FAFC]">System Default</h4>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-normal">
                  Automatically sync with your operating system preferences.
                </p>
              </div>
              <div className="h-10 rounded-xl bg-gradient-to-r from-white to-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-2 flex items-center justify-between shadow-xs">
                <div className="w-4 h-4 rounded-md bg-[#2563EB]" />
                <div className="w-4 h-4 rounded-md bg-[#3B82F6]" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Security & Password */}
      {tab === 'security' && (
        <form onSubmit={handleChangePassword} className="fintech-card p-6 sm:p-8 space-y-4 max-w-lg">
          <h3 className="font-semibold text-base text-[#1E293B] dark:text-[#F8FAFC]">Change Account Password</h3>
          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Current Password *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">New Password *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1.5">Confirm New Password *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-sm font-medium shadow-xs disabled:opacity-50 transition-all"
            >
              {saving ? 'Updating password...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
