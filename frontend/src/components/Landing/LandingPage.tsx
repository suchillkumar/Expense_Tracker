import { useState } from 'react'
import { Logo } from '../Shared/Logo'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

interface LandingPageProps {
  onGetStarted: () => void
  onLogin: () => void
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const { isDark, toggleTheme } = useTheme()
  const { loginDemo, loading } = useAuth()
  const toast = useToast()

  const [monthlyIncome, setMonthlyIncome] = useState(75000)
  const [demoLoading, setDemoLoading] = useState(false)

  // 50/30/20 Rule Calculations
  const needsAmount = Math.round(monthlyIncome * 0.5)
  const wantsAmount = Math.round(monthlyIncome * 0.3)
  const savingsAmount = Math.round(monthlyIncome * 0.2)
  const annualSavings = savingsAmount * 12

  const handleDemoAccess = async () => {
    setDemoLoading(true)
    try {
      await loginDemo()
      toast.success('Welcome! Loaded 12 months of live demo data.')
    } catch {
      toast.error('Unable to initialize demo session')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-white transition-colors duration-200 selection:bg-blue-500 selection:text-white">
      {/* ── Navigation Bar ── */}
      <nav className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090D16]/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Logo size="md" lightText={isDark} />

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-white transition-colors">Features</a>
            <a href="#calculator" className="hover:text-blue-600 dark:hover:text-white transition-colors">50/30/20 Planner</a>
            <a href="#ai-intelligence" className="hover:text-blue-600 dark:hover:text-white transition-colors">AI Intelligence</a>
            <a href="#security" className="hover:text-blue-600 dark:hover:text-white transition-colors">Security & Privacy</a>
          </div>

          {/* Action Buttons & Theme Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              title="Toggle Theme"
              aria-label="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* Instant Demo Button */}
            <button
              onClick={handleDemoAccess}
              disabled={demoLoading || loading}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/80 transition-all active:scale-95"
            >
              <span>⚡</span>
              <span>{demoLoading ? 'Starting...' : 'Live Demo'}</span>
            </button>

            {/* Sign In */}
            <button
              onClick={onLogin}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
            >
              Sign In
            </button>

            {/* Get Started Free */}
            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Get Started Free →
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-purple-500/10 dark:bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI-Powered Personal Finance & Budget Management</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
            Smart, Beautiful & Effortless{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent dark:from-blue-400 dark:via-indigo-300 dark:to-sky-300">
              Expense Tracking
            </span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            Take total control of your money with real-time cashflow analytics, automated 50/30/20 budget allocations, and personalized AI financial recommendations.
          </p>

          {/* Action CTA Buttons */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={handleDemoAccess}
              disabled={demoLoading || loading}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
            >
              <span>⚡</span>
              <span>{demoLoading ? 'Launching Demo...' : 'Explore Live Demo (1-Click)'}</span>
            </button>

            <button
              onClick={onGetStarted}
              className="px-6 py-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
            >
              Create Free Account →
            </button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-12 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Real-Time AI Categorization
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> 50/30/20 Smart Budgets
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> Multi-Currency & CSV Export
            </div>
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> 100% Private & Encrypted
            </div>
          </div>
        </div>

        {/* ── Live Interactive Mockup Showcase ── */}
        <div className="max-w-5xl mx-auto mt-14 relative">
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-slate-200/50 dark:shadow-black/50">
            {/* Mockup Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs font-medium text-slate-400">Dashboard Preview</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Live Synced
                </span>
              </div>
            </div>

            {/* Mockup KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Monthly Inflows</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹1,07,000</p>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <span>▲ +12%</span>
                  <span className="text-slate-400 font-normal">vs last month</span>
                </p>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Expenses</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">₹42,850</p>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                  <span>▼ -8%</span>
                  <span className="text-slate-400 font-normal">budget on track</span>
                </p>
              </div>

              <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Net Monthly Savings</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">₹64,150</p>
                <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                  60% savings rate (Healthy)
                </p>
              </div>
            </div>

            {/* Mockup Recent Inflows/Outflows */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-green-50 dark:bg-green-950/60 text-green-600 flex items-center justify-center font-bold">
                  💼
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Corporate Salary</p>
                  <p className="text-[10px] text-slate-400">Bank Transfer • 1st of month</p>
                </div>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">+₹85,000</span>

              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 flex items-center justify-center font-bold">
                  🏠
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Apartment Rent</p>
                  <p className="text-[10px] text-slate-400">Auto Debit • Needs (50%)</p>
                </div>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100">-₹24,000</span>

              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold">
                  🍔
                </span>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Groceries & Dining</p>
                  <p className="text-[10px] text-slate-400">UPI • Safe within budget</p>
                </div>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100">-₹4,200</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive 50/30/20 Budget Calculator ── */}
      <section id="calculator" className="py-20 px-4 sm:px-6 bg-slate-100/70 dark:bg-[#0B101E] border-y border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="max-w-4xl mx-auto bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 sm:p-10 shadow-xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              Interactive Financial Tool
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              The 50/30/20 Smart Budget Model
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 font-normal">
              Slide your monthly income to see the ideal financial split recommended by financial advisors.
            </p>
          </div>

          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Slider */}
            <div>
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span className="text-slate-600 dark:text-slate-400">Monthly Net Income</span>
                <span className="text-blue-600 dark:text-blue-400 text-lg font-bold">
                  ₹{monthlyIncome.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="15000"
                max="500000"
                step="5000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1">
                <span>₹15,000</span>
                <span>₹2,50,000</span>
                <span>₹5,00,000</span>
              </div>
            </div>

            {/* 3 Categories Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Needs 50% */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 mb-1">
                  50% NEEDS
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  ₹{needsAmount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Rent, utilities, groceries, health
                </p>
              </div>

              {/* Wants 30% */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 mb-1">
                  30% WANTS
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  ₹{wantsAmount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Dining, entertainment, shopping
                </p>
              </div>

              {/* Savings 20% */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 text-center">
                <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mb-1">
                  20% SAVINGS
                </div>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{savingsAmount.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Investments, emergency fund
                </p>
              </div>
            </div>

            {/* Annual Wealth Growth Forecast */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/20 text-center">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Projected 1-Year Wealth Accumulation: <span className="text-blue-600 dark:text-blue-400 text-base font-bold">₹{annualSavings.toLocaleString()}</span>
              </p>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={handleDemoAccess}
                disabled={demoLoading || loading}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
              >
                Apply this Budget to Live Account →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comprehensive Features Grid ── */}
      <section id="features" className="py-24 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Everything You Need for Financial Freedom
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 font-normal">
            Designed for clarity, built for speed, and powered by intelligent financial analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Real-Time Inflow & Outflow</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Record daily expenses in seconds with payment method tags, receipt notes, multi-currency conversion, and smart auto-category suggestions.
            </p>
          </div>

          {/* Card 2 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">AI Financial Advisor</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Chat directly with Google Gemini AI grounded on your actual transactions. Ask questions, discover spending leaks, and forecast future savings.
            </p>
          </div>

          {/* Card 3 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Dynamic Category Caps</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Set monthly spending thresholds per category. Receive instant visual alert notifications when you approach 80% or exceed your budget limits.
            </p>
          </div>

          {/* Card 4 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📈
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Interactive Visual Analytics</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Explore 6-month trends, category donut distributions, weekday spending velocity, and payment method charts with smooth Recharts visualizations.
            </p>
          </div>

          {/* Card 5 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📑
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Printable Reports & CSV Export</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Generate clean, print-ready annual and monthly statements. Export full financial ledger history to CSV spreadsheets with a single click.
            </p>
          </div>

          {/* Card 6 */}
          <div className="fintech-card p-6 fintech-card-hover group">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🌓
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Pure White & FinTech Navy Themes</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Seamlessly toggle between crisp Pure White light mode and sleek FinTech Navy dark mode, engineered for maximum readability and visual comfort.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#070A12] py-12 px-4 sm:px-6 text-xs text-slate-500 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-6">
          <Logo size="sm" lightText={isDark} />

          <div className="flex items-center gap-6 text-slate-600 dark:text-slate-400 font-medium">
            <button onClick={handleDemoAccess} className="hover:text-blue-600 dark:hover:text-white">Live Demo</button>
            <button onClick={onLogin} className="hover:text-blue-600 dark:hover:text-white">Sign In</button>
            <button onClick={onGetStarted} className="hover:text-blue-600 dark:hover:text-white">Create Account</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
