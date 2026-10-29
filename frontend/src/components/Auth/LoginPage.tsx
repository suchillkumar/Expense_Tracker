import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { api } from '../../services/api'
import { Logo } from '../Shared/Logo'

interface LoginPageProps {
  onBackToHome?: () => void
}

export function LoginPage({ onBackToHome }: LoginPageProps) {
  const { login, loginDemo, register, loading } = useAuth()
  const toast = useToast()
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')

  // Registration / Login fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Reset fields
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  // Status
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Client-side validations
    if (mode === 'register') {
      if (!name.trim()) return setError('Please enter your full name.')
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.')
      if (password.length < 8) return setError('Password must be at least 8 characters long.')
      if (password !== confirmPassword) return setError('Passwords do not match.')
    }

    if (mode === 'login') {
      if (!email.trim()) return setError('Please enter your email.')
      if (!password) return setError('Please enter your password.')
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast.success('Welcome back to Expense Tracker!')
      } else if (mode === 'register') {
        await register(name, email, password, phone, confirmPassword)
        toast.success('Account created successfully! Welcome to Expense Tracker.')
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email)
        toast.info(res.message || 'Password reset instructions generated.')
        if (res.token) {
          setResetToken(res.token)
          setMode('reset')
        }
      } else if (mode === 'reset') {
        if (newPassword.length < 8) return setError('New password must be at least 8 characters.')
        if (newPassword !== confirmNewPassword) return setError('New passwords do not match.')
        await api.resetPassword(resetToken, newPassword)
        toast.success('Password has been reset successfully!')
        setMode('login')
        setPassword('')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDemoLogin = async () => {
    setError('')
    setSubmitting(true)
    try {
      await loginDemo()
      toast.success('Welcome! Signed in with full 12-month demo dataset.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-2.5 text-sm bg-white dark:bg-[#1E293B] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all font-normal shadow-xs'

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Top Back to Home Button */}
        {onBackToHome && (
          <div className="mb-4">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/80 transition-all hover:-translate-x-0.5"
            >
              <span>←</span>
              <span>Back to Home</span>
            </button>
          </div>
        )}

        {/* Expense Tracker Brand Logo */}
        <div className="flex flex-col items-center justify-center mb-6">
          <Logo size="xl" showText={true} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
            Smart Expense & Budget Intelligence
          </p>
        </div>

        {/* Quick Instant Demo Box */}
        {(mode === 'login' || mode === 'register') && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 dark:border-blue-400/20 flex items-center justify-between gap-3 shadow-xs">
            <div>
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <span>⚡</span> Want to test immediately?
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                1-click access with 12 months of rich sample data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={submitting || loading}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs hover:shadow transition-all shrink-0 active:scale-95"
            >
              Explore Demo →
            </button>
          </div>
        )}

        {/* Auth Card Container */}
        <div className="bg-white/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-3xl shadow-card dark:shadow-card-dark p-7 sm:p-8 border border-slate-200/80 dark:border-slate-800/80">
          {/* Switcher Tab */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-1 mb-6 border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError('') }}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Reset Account Password</h2>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">Enter your registered email to receive a password reset token.</p>
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#1E293B] dark:text-[#F8FAFC]">Set New Password</h2>
              <p className="text-sm text-[#64748B] dark:text-[#94A3B8] mt-1 font-normal">Enter your reset token and new secure password.</p>
            </div>
          )}

          {error && (
            <div className="p-3 mb-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-[#DC2626] dark:text-[#F87171] text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className={inputClass}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className={inputClass}
                />
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className={inputClass}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC]">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError('') }}
                      className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] font-medium"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B] hover:text-[#1E293B] dark:hover:text-[#F8FAFC] font-medium"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                    Reset Token *
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste reset token here"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC] mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] dark:bg-[#3B82F6] dark:hover:bg-[#60A5FA] text-white text-sm font-medium shadow-xs transition-all disabled:opacity-50 mt-2"
            >
              {submitting || loading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to Dashboard'
                : mode === 'register'
                ? 'Create My Account'
                : mode === 'forgot'
                ? 'Send Reset Instructions'
                : 'Reset Password'}
            </button>
          </form>

          {mode === 'forgot' && (
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="text-sm font-medium text-[#2563EB] dark:text-[#60A5FA] hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
