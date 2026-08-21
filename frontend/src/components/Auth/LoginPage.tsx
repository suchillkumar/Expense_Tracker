import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { api } from '../../services/api'
import { Logo } from '../Shared/Logo'

export function LoginPage() {
  const { login, register, loading } = useAuth()
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

  const inputClass =
    'w-full border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50 to-sky-50/60 dark:from-[#0B0F19] dark:via-[#0F172A] dark:to-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        {/* Expense Tracker Brand Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <Logo size="xl" showText={true} />
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-2 font-medium">
            Smart Expense Management
          </p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-gray-100 dark:border-slate-800">
          {/* Switcher Tab */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-slate-800 rounded-2xl p-1.5 mb-6">
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError('') }}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all ${
                  mode === 'register'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Reset Account Password</h2>
              <p className="text-xs text-gray-400 mt-1">Enter your registered email to receive a password reset token.</p>
            </div>
          )}

          {mode === 'reset' && (
            <div className="mb-6">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Set New Password</h2>
              <p className="text-xs text-gray-400 mt-1">Enter your reset token and new secure password.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya Sharma"
                    className={inputClass}
                  />
                </div>

                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    Password *
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError('') }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className={`${inputClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            )}

            {mode === 'reset' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Reset Token *</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste reset token"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">New Password *</label>
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Confirm New Password *</label>
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

            {/* Error Message */}
            {error && (
              <div className="text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 rounded-2xl px-4 py-3 border border-red-200 dark:border-red-900 animate-fade-in flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading || submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Authenticating...</span>
                </>
              ) : mode === 'login' ? (
                'Sign In to Dashboard →'
              ) : mode === 'register' ? (
                'Create Account & Get Started →'
              ) : mode === 'forgot' ? (
                'Send Reset Token'
              ) : (
                'Save New Password'
              )}
            </button>

            {(mode === 'forgot' || mode === 'reset') && (
              <button
                type="button"
                onClick={() => { setMode('login'); setError('') }}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-bold pt-2"
              >
                ← Back to Sign In
              </button>
            )}
          </form>

          <div className="border-t border-gray-100 dark:border-slate-800 mt-6 pt-4 text-center">
            <p className="text-[10px] text-gray-400">
              🔒 256-bit encrypted security • AI-assisted financial ledger
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
