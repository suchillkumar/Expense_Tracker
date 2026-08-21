import { useState } from 'react'
import { Logo } from '../Shared/Logo'

interface LandingPageProps {
  onGetStarted: () => void
  onLogin: () => void
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [monthlyIncome, setMonthlyIncome] = useState(60000)
  const potentialAnnualSavings = Math.round(monthlyIncome * 0.2 * 12)

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <Logo size="md" lightText={true} />

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#calculator" className="hover:text-white transition-colors">50/30/20 Calculator</a>
            <a href="#ai-intelligence" className="hover:text-white transition-colors">AI Intelligence</a>
            <a href="#reports" className="hover:text-white transition-colors">Reports & Analytics</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-all border border-slate-800"
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              Get Started Free →
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-24 px-6 text-center">
        {/* Background Glow Orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-indigo-400 text-xs font-bold mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            Smart AI-Powered Expense & Budget Management
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Master Your Money with{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-300 bg-clip-text text-transparent">
              Expense Tracker AI
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Track every rupee, automate category tags in real time, build intelligent 50/30/20 monthly budgets, and chat directly with your AI financial advisor.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-black text-sm shadow-xl shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5"
            >
              Start Free Today 🚀
            </button>
            <button
              onClick={onLogin}
              className="px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-800 transition-all"
            >
              Sign In to Dashboard
            </button>
          </div>

          {/* Feature Highlights Pills */}
          <div className="mt-14 pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-400">✓</span> Real-Time AI Categorization
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-400">✓</span> 50/30/20 Dynamic Budgets
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-400">✓</span> Dark & Light Themes
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-emerald-400">✓</span> Printable PDF & CSV Export
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section id="calculator" className="py-16 px-6 bg-slate-900/40 border-y border-slate-800">
        <div className="max-w-4xl mx-auto bg-slate-950 rounded-3xl border border-slate-800 p-8 sm:p-12 shadow-2xl">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Interactive 50/30/20 Calculator</h2>
            <p className="text-xs text-slate-400 mt-2">
              Adjust your monthly earnings to see how the Expense Tracker AI model allocates your funds.
            </p>
          </div>

          <div className="space-y-6 max-w-xl mx-auto">
            <div>
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-400">Monthly Net Income</span>
                <span className="text-indigo-400 text-base font-black">₹{monthlyIncome.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Recommended Monthly Savings (20%)</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{Math.round(monthlyIncome * 0.2).toLocaleString()}
                </p>
              </div>

              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase">Estimated Annual Wealth Growth</p>
                <p className="text-2xl font-black text-indigo-400 mt-1">
                  ₹{potentialAnnualSavings.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={onGetStarted}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
              >
                Apply to My Live Account →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Features Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-black text-white">Engineered for Complete Financial Control</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-3">
            Every feature is laser-focused on tracking expenses, monitoring budgets, and growing your personal savings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              💸
            </div>
            <h3 className="text-base font-bold text-white mb-2">Real-Time Expense Tracking</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Record inflows and outflows in seconds with smart auto-categorization suggestions as you type.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <h3 className="text-base font-bold text-white mb-2">Conversational AI Advisor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask questions like "Where did I spend the most?" or "Can I save ₹5,000 this month?" with real database grounding.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              🎯
            </div>
            <h3 className="text-base font-bold text-white mb-2">Dynamic Category Budgets</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Set monthly category spending caps with color-coded utilization progress and threshold alert notifications.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-base font-bold text-white mb-2">Interactive Visual Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Explore 6-month trends, category donuts, weekend velocity, and payment method breakdowns with Recharts.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              📑
            </div>
            <h3 className="text-base font-bold text-white mb-2">Printable Reports & CSV Exports</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download clean monthly and annual financial audits formatted for PDF print and CSV spreadsheet exports.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-7 hover:border-slate-700 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform">
              🌙
            </div>
            <h3 className="text-base font-bold text-white mb-2">Sleek Dark Mode & Multi-Currency</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Seamlessly switch between INR, USD, EUR, GBP, and enjoy a polished dark theme engineered for visual comfort.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-12 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Logo size="sm" lightText={true} />

          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <button onClick={onLogin} className="hover:text-white">Sign In</button>
            <button onClick={onGetStarted} className="hover:text-white">Create Account</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
