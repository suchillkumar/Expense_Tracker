import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useExpense } from '../../context/ExpenseContext'
import { useToast } from '../../context/ToastContext'
import { formatMoney } from '../../services/currencyService'
import { MonthlyReport, YearlyReport } from '../../types'
import { Logo } from '../Shared/Logo'

export function ReportsView() {
  const { transactions, budgets, currency } = useExpense()
  const toast = useToast()

  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null)
  const [loading, setLoading] = useState(false)

  // Generate list of available months (last 12 months)
  const availableMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  // Load / Compute Monthly Report
  useEffect(() => {
    if (reportType !== 'monthly') return
    setLoading(true)
    api.getMonthlyReport(selectedMonth)
      .then(setReport)
      .catch(() => {
        // Fallback local report calculation
        const monthTxs = transactions.filter((t) => t.date.slice(0, 7) === selectedMonth)
        const income = monthTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = monthTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const netSavings = Math.max(0, income - expense)
        const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0

        const catMap: Record<string, number> = {}
        monthTxs.filter((t) => t.type === 'expense').forEach((t) => {
          catMap[t.category] = (catMap[t.category] || 0) + t.amount
        })

        const topCategories = Object.entries(catMap)
          .map(([cat, amt]) => ({
            category: cat,
            amount: amt,
            percentage: expense > 0 ? Math.round((amt / expense) * 100) : 0,
          }))
          .sort((a, b) => b.amount - a.amount)

        const highestTx = monthTxs
          .filter((t) => t.type === 'expense')
          .sort((a, b) => b.amount - a.amount)[0] || null

        const activeBudgets = budgets.filter((b) => b.month === selectedMonth)
        const budgetPerformance = activeBudgets.map((b) => {
          const spent = catMap[b.category] || 0
          const allocated = b.limitAmount || 1
          return {
            category: b.category,
            allocated: b.limitAmount,
            spent,
            remaining: Math.max(0, b.limitAmount - spent),
            utilizationPct: Math.round((spent / allocated) * 100),
            status: (spent > b.limitAmount
              ? 'exceeded'
              : spent >= b.limitAmount * 0.8
              ? 'warning'
              : 'on_track') as 'exceeded' | 'warning' | 'on_track',
          }
        })

        setReport({
          month: selectedMonth,
          currency,
          summary: {
            totalIncome: income,
            totalExpense: expense,
            netSavings,
            savingsRate,
            transactionCount: monthTxs.length,
            incomeCount: monthTxs.filter((t) => t.type === 'income').length,
            expenseCount: monthTxs.filter((t) => t.type === 'expense').length,
          },
          topCategories,
          budgetPerformance,
          spendingTrends: [],
          highestTransaction: highestTx,
          generatedAt: new Date().toISOString(),
        })
      })
      .finally(() => setLoading(false))
  }, [reportType, selectedMonth, transactions, budgets, currency])

  // Load / Compute Yearly Report
  useEffect(() => {
    if (reportType !== 'yearly') return
    setLoading(true)
    api.getYearlyReport(selectedYear)
      .then(setYearlyReport)
      .catch(() => {
        const yearStr = String(selectedYear)
        const yearTxs = transactions.filter((t) => t.date.startsWith(yearStr))
        const income = yearTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const expense = yearTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
        const netSavings = Math.max(0, income - expense)
        const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0

        const monthlyComparison: YearlyReport['monthlyComparison'] = []
        for (let m = 1; m <= 12; m++) {
          const ym = `${yearStr}-${String(m).padStart(2, '0')}`
          const mTxs = yearTxs.filter((t) => t.date.startsWith(ym))
          const inc = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
          const exp = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
          monthlyComparison.push({
            month: ym,
            income: inc,
            expense: exp,
            savings: Math.max(0, inc - exp),
          })
        }

        const catMap: Record<string, number> = {}
        yearTxs.filter((t) => t.type === 'expense').forEach((t) => {
          catMap[t.category] = (catMap[t.category] || 0) + t.amount
        })

        const categoryAnalysis = Object.entries(catMap)
          .map(([cat, amt]) => ({
            category: cat,
            amount: amt,
            percentage: expense > 0 ? Math.round((amt / expense) * 100) : 0,
          }))
          .sort((a, b) => b.amount - a.amount)

        setYearlyReport({
          year: selectedYear,
          currency,
          summary: {
            totalAnnualIncome: income,
            totalAnnualExpense: expense,
            totalAnnualSavings: netSavings,
            annualSavingsRate: savingsRate,
            totalTransactions: yearTxs.length,
          },
          monthlyComparison,
          categoryAnalysis,
          generatedAt: new Date().toISOString(),
        })
      })
      .finally(() => setLoading(false))
  }, [reportType, selectedYear, transactions, currency])

  // Print Statement Handler
  const handlePrint = () => {
    window.print()
  }

  // Export CSV Handler
  const handleExportCSV = () => {
    const dataToExport =
      reportType === 'monthly'
        ? transactions.filter((t) => t.date.slice(0, 7) === selectedMonth)
        : transactions.filter((t) => t.date.startsWith(String(selectedYear)))

    if (dataToExport.length === 0) {
      toast.error('No transactions available to export.')
      return
    }

    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment Method', 'Notes']
    const rows = dataToExport.map((t) => [
      t.date,
      t.type,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.paymentMethod || 'Cash',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `expense_tracker_report_${reportType === 'monthly' ? selectedMonth : selectedYear}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('CSV Statement exported!')
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* 1. Header & Controls (Hidden in Print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Financial Statements & Reports
          </h2>
          <p className="text-xs text-[#64748B] dark:text-slate-400 mt-0.5">
            Audit-ready monthly summaries, yearly financial statements, CSV exports, and print documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Report Type Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-[#243244] p-1 rounded-xl gap-1 text-xs font-bold border border-[#E2E8F0] dark:border-[#334155]">
            <button
              onClick={() => setReportType('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                reportType === 'monthly'
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setReportType('yearly')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                reportType === 'yearly'
                  ? 'bg-white dark:bg-[#1E293B] text-[#2563EB] dark:text-[#60A5FA] shadow-xs'
                  : 'text-[#64748B] hover:text-[#1E293B] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Yearly
            </button>
          </div>

          {/* Month / Year Selector */}
          {reportType === 'monthly' ? (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#243244] text-[#1E293B] dark:text-[#F8FAFC] rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {new Date(`${m}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#0F172A] dark:text-white rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
            >
              {[2026, 2025, 2024, 2023].map((y) => (
                <option key={y} value={y}>{y} Annual</option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-emerald-600 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>📥</span> Export CSV
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>🖨️</span> Print / PDF
          </button>
        </div>
      </div>

      {/* ── REPORT CONTENT CONTAINER (Optimized for Screen & Print) ── */}
      {loading ? (
        <div className="fintech-card p-12 text-center">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-[#2563EB] rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-[#64748B]">Compiling financial audit report...</p>
        </div>
      ) : reportType === 'monthly' && report ? (
        <div className="space-y-6 print:space-y-4">
          {/* Printable Header Banner */}
          <div className="fintech-card bg-gradient-to-r from-[#0F172A] to-slate-900 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Logo size="sm" lightText={true} />
                <span className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                  Monthly Statement
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black">
                {new Date(`${selectedMonth}-01`).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generated: {new Date(report.generatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Net Monthly Savings</p>
              <p className="text-2xl sm:text-3xl font-black text-[#10B981] tabular-numbers">
                {formatMoney(report.summary.netSavings, currency)}
              </p>
              <p className="text-xs text-slate-300">Savings Rate: {report.summary.savingsRate}%</p>
            </div>
          </div>

          {/* 4 Statement KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="fintech-card p-5 border-t-3 border-t-[#2563EB]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Total Revenue / Inflow</p>
              <p className="text-2xl font-black text-[#2563EB] mt-1.5 tabular-numbers">
                {formatMoney(report.summary.totalIncome, currency)}
              </p>
            </div>
            <div className="fintech-card p-5 border-t-3 border-t-[#EF4444]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Total Outflow / Spent</p>
              <p className="text-2xl font-black text-[#EF4444] mt-1.5 tabular-numbers">
                {formatMoney(report.summary.totalExpense, currency)}
              </p>
            </div>
            <div className="fintech-card p-5 border-t-3 border-t-[#10B981]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Net Monthly Savings</p>
              <p className="text-2xl font-black text-[#10B981] mt-1.5 tabular-numbers">
                {formatMoney(report.summary.netSavings, currency)}
              </p>
            </div>
            <div className="fintech-card p-5 border-t-3 border-t-[#7C3AED]">
              <p className="text-[11px] font-bold text-[#64748B] dark:text-slate-400 uppercase">Activity Count</p>
              <p className="text-2xl font-black text-[#0F172A] dark:text-white mt-1.5 tabular-numbers">
                {report.summary.transactionCount} entries
              </p>
            </div>
          </div>

          {/* Top Spending Categories Table */}
          <div className="fintech-card p-6 space-y-4">
            <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">Category Breakdown & Variance</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-[#E2E8F0] dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                  {report.topCategories.map((c) => (
                    <tr key={c.category} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-[#0F172A] dark:text-white">{c.category}</td>
                      <td className="py-2.5 px-4 text-right font-black tabular-numbers text-[#EF4444]">
                        {formatMoney(c.amount, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#64748B] tabular-numbers">{c.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : reportType === 'yearly' && yearlyReport ? (
        <div className="space-y-6 print:space-y-4">
          <div className="fintech-card bg-gradient-to-r from-[#0F172A] to-slate-900 text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Logo size="sm" lightText={true} />
                <span className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">
                  Annual Audit Statement
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black">{yearlyReport.year} Financial Year</h3>
              <p className="text-xs text-slate-400 mt-1">
                Audited summary covering 12 calendar months
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Total Net Surplus</p>
              <p className="text-2xl sm:text-3xl font-black text-[#10B981] tabular-numbers">
                {formatMoney(yearlyReport.summary.totalAnnualSavings, currency)}
              </p>
              <p className="text-xs text-slate-300">Annual Savings Rate: {yearlyReport.summary.annualSavingsRate}%</p>
            </div>
          </div>

          {/* 12-Month Progression Table */}
          <div className="fintech-card p-6 space-y-4">
            <h4 className="font-bold text-sm text-[#0F172A] dark:text-white">12-Month Financial Flow</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider bg-[#F8FAFC] dark:bg-slate-800/40 border-b border-[#E2E8F0] dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Month</th>
                    <th className="py-2.5 px-4 text-right">Income</th>
                    <th className="py-2.5 px-4 text-right">Expenses</th>
                    <th className="py-2.5 px-4 text-right">Surplus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/60">
                  {yearlyReport.monthlyComparison.map((m) => (
                    <tr key={m.month} className="hover:bg-[#F8FAFC] dark:hover:bg-slate-800/30">
                      <td className="py-2.5 px-4 font-bold text-[#0F172A] dark:text-white">
                        {new Date(`${m.month}-01`).toLocaleDateString('default', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#2563EB] tabular-numbers">
                        {formatMoney(m.income, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#EF4444] tabular-numbers">
                        {formatMoney(m.expense, currency)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-[#10B981] tabular-numbers">
                        {formatMoney(m.savings, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
