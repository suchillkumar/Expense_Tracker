export type TransactionType = 'income' | 'expense'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  avatarUrl?: string
  age?: number
  occupation?: string
  monthlyIncome?: number
  preferredCurrency?: string
  monthlySavingsGoal?: number
  financialGoal?: string
  preferredBudgetPeriod?: string
  onboardingCompleted?: boolean
  timezone?: string
  createdAt?: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
  paymentMethod?: string
  notes?: string
  currency?: string
  exchangeRate?: number
  createdAt?: string
  updatedAt?: string
}

export interface Budget {
  id: string
  name?: string
  category: string
  limitAmount: number
  spentAmount: number
  month: string
  period?: 'monthly' | 'yearly'
  startDate?: string
  endDate?: string
  alertThreshold?: number
  createdAt?: string
}

export interface AppNotification {
  id: string
  title?: string
  message: string
  date: string
  read: boolean
  type: 'alert' | 'info' | 'warning'
  category?: string
}

export interface Session {
  userId: string
  token: string
}

/* ================= CATEGORIES (Section 10 & 14) ================= */

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Entertainment',
  'Education',
  'Healthcare',
  'Rent',
  'Travel',
  'Other'
] as const

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other'
] as const

export const CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Gift'
] as const

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'UPI',
  'Bank Transfer',
  'Other'
] as const

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
] as const

/* ================= AI TYPES (Section 22 - 28) ================= */

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  quickStats?: {
    income?: number
    expense?: number
    balance?: number
  }
}

export interface AIInsight {
  id?: string
  type: 'trend' | 'anomaly' | 'budget_warning' | 'savings_opportunity'
  title: string
  explanation: string
  amount?: number
  category?: string
  recommendation?: string
  date?: string
}

export interface SpendingAnalysisResult {
  period: string
  currentTotalExpense: number
  previousTotalExpense: number
  overallChangePct: number
  highestSpendingCategory: {
    category: string
    currentAmount: number
    shareOfTotal: number
  }
  categoryBreakdown: Array<{
    category: string
    currentAmount: number
    previousAmount: number
    changePct: number
    isIncrease: boolean
    shareOfTotal: number
  }>
  weekendVsWeekday: {
    weekendTotal: number
    weekdayTotal: number
    weekendAvgPerTx: number
    weekdayAvgPerTx: number
    weekendPercentage: number
  }
  subscriptionAnalysis: {
    total: number
    count: number
    items: Array<{ description: string; amount: number; category: string }>
  }
  anomalies: Array<{
    date: string
    amount: number
    expected: number
    z_score: number
    severity: string
    description?: string
  }>
  suggestions: string[]
}

export interface ExpensePredictionResult {
  isLimitedData: boolean
  confidenceScore: number
  dataSummary: string
  monthlyPredictions: Array<{
    month: string
    monthLabel: string
    expectedIncome: number
    expectedExpense: number
    expectedSavings: number
    expectedSavingsRate: number
  }>
  categoryPredictions: Array<{
    category: string
    expectedMonthlyAmount: number
    budgetLimit: number
    overrunRisk: boolean
    overrunAmount: number
    riskLevel: 'low' | 'medium' | 'high'
  }>
  potentialOverruns: Array<{
    category: string
    expectedMonthlyAmount: number
    budgetLimit: number
    overrunAmount: number
  }>
}

export interface SavingRecommendationResult {
  currentMonthlySpending: number
  totalPotentialMonthlySaving: number
  optimizedMonthlySpending: number
  yearlySavingsMultiplier: number
  recommendations: Array<{
    id: string
    category: string
    icon: string
    title: string
    description: string
    potentialMonthlySaving: number
    difficulty: 'Easy' | 'Medium' | 'Hard'
    impact: 'Low' | 'Medium' | 'High'
  }>
}

export interface BudgetRecommendation {
  monthlyIncome: number
  needs: { amount: number; percentage: number; description: string }
  wants: { amount: number; percentage: number; description: string }
  savings: { amount: number; percentage: number; description: string }
  emergencyFund: { amount: number; percentage: number; description: string }
  categoryBudgets: Array<{
    category: string
    recommendedAmount: number
    percentageOfIncome: number
    rationale: string
  }>
}

/* ================= REPORTS (Section 31) ================= */

export interface MonthlyReport {
  month: string
  currency: string
  summary: {
    totalIncome: number
    totalExpense: number
    netSavings: number
    savingsRate: number
    transactionCount: number
    incomeCount: number
    expenseCount: number
  }
  highestTransaction?: Transaction | null
  topCategories: Array<{
    category: string
    amount: number
    percentage: number
  }>
  budgetPerformance: Array<{
    category: string
    allocated: number
    spent: number
    remaining: number
    utilizationPct: number
    status: 'on_track' | 'warning' | 'exceeded'
  }>
  spendingTrends: Array<{
    day: string
    income: number
    expense: number
  }>
  generatedAt: string
}

export interface YearlyReport {
  year: number
  currency: string
  summary: {
    totalAnnualIncome: number
    totalAnnualExpense: number
    totalAnnualSavings: number
    annualSavingsRate: number
    totalTransactions: number
  }
  monthlyComparison: Array<{
    month: string
    income: number
    expense: number
    savings: number
  }>
  categoryAnalysis: Array<{
    category: string
    amount: number
    percentage: number
  }>
  generatedAt: string
}
