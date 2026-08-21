import { Transaction } from '../models/Transaction.js'
import { Budget } from '../models/Budget.js'
import { Goal } from '../models/Goal.js'
import { RecurringTemplate } from '../models/RecurringTemplate.js'
import { User } from '../models/User.js'

const CATEGORY_KEYWORDS = {
  Food: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'grocer', 'food', 'lunch', 'dinner', 'breakfast', 'meal', 'swiggy', 'zomato', 'doordash', 'snack', 'kfc', 'mcdonald', 'starbucks', 'dining'],
  Transportation: ['uber', 'lyft', 'taxi', 'bus', 'train', 'metro', 'gas', 'fuel', 'parking', 'flight', 'airline', 'travel', 'ola', 'auto', 'petrol', 'diesel', 'toll'],
  Bills: ['electric', 'water', 'internet', 'phone', 'mobile', 'utility', 'bill', 'subscription', 'netflix', 'spotify', 'recharge', 'broadband', 'electricity', 'gas bill', 'wifi'],
  Shopping: ['amazon', 'store', 'mall', 'clothes', 'shoes', 'electronics', 'gadget', 'purchase', 'order', 'flipkart', 'myntra', 'zara', 'h&m', 'apparel'],
  Entertainment: ['movie', 'cinema', 'game', 'concert', 'theater', 'youtube', 'disney', 'hulu', 'steam', 'playstation', 'bookmyshow', 'gaming', 'pub', 'club'],
  Healthcare: ['pharmacy', 'medicine', 'doctor', 'hospital', 'gym', 'fitness', 'health', 'clinic', 'dentist', 'apollo', 'practo', 'medplus'],
  Education: ['course', 'book', 'tuition', 'school', 'university', 'udemy', 'coursera', 'college', 'exam', 'fees', 'class'],
  Salary: ['salary', 'payroll', 'wage', 'income', 'deposit', 'stipend', 'bonus', 'freelance'],
  Investment: ['stock', 'mutual', 'fund', 'investment', 'dividend', 'crypto', 'zerodha', 'groww', 'sip', 'etf', 'bitcoin'],
  Gift: ['gift', 'donation', 'charity', 'present', 'reward', 'cashback'],
  Travel: ['hotel', 'booking', 'airbnb', 'resort', 'vacation', 'trip', 'flight', 'tour'],
  Rent: ['rent', 'lease', 'apartment', 'house', 'landlord', 'flat', 'pg', 'hostel'],
  Insurance: ['insurance', 'premium', 'coverage', 'lic', 'policy'],
}

export const categorizeTransaction = (description) => {
  if (!description || typeof description !== 'string') return 'Other'
  const desc = description.toLowerCase()
  let bestCategory = 'Other'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (desc.includes(kw) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestCategory = category
    }
  }
  return bestCategory
}

export const detectAnomalies = async (userId) => {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const rows = await Transaction.aggregate([
    { $match: { user_id: userId, is_deleted: false, date: { $gte: ninetyDaysAgo } } },
    { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { '_id.day': 1 } },
  ])

  const expenses = rows.filter((d) => d._id.type === 'expense').map((d) => d.total)
  if (expenses.length < 5) return []

  const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length
  const variance = expenses.reduce((a, b) => a + (b - mean) ** 2, 0) / expenses.length
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return []

  const anomalies = []
  rows.forEach((day) => {
    if (day._id.type !== 'expense') return
    const amount = day.total
    const zScore = (amount - mean) / stdDev
    if (zScore > 1.8) {
      anomalies.push({
        date: day._id.day,
        amount,
        expected: Math.round(mean * 100) / 100,
        z_score: Math.round(zScore * 100) / 100,
        severity: zScore > 2.8 ? 'high' : 'medium',
        description: `Unusual single-day expense surge of ${Math.round(amount)} (avg: ${Math.round(mean)})`,
      })
    }
  })
  return anomalies.sort((a, b) => b.z_score - a.z_score)
}

export const forecastSpending = async (userId, months = 6) => {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const rows = await Transaction.aggregate([
    { $match: { user_id: userId, is_deleted: false, date: { $gte: twelveMonthsAgo } } },
    { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { '_id.month': 1 } },
  ])

  const monthlyData = {}
  rows.forEach((row) => {
    const key = row._id.month
    if (!monthlyData[key]) monthlyData[key] = { income: 0, expense: 0 }
    monthlyData[key][row._id.type] = row.total
  })

  const recentMonths = Object.keys(monthlyData).slice(-6)
  const avgIncome = recentMonths.length ? recentMonths.reduce((s, m) => s + monthlyData[m].income, 0) / recentMonths.length : 0
  const avgExpense = recentMonths.length ? recentMonths.reduce((s, m) => s + monthlyData[m].expense, 0) / recentMonths.length : 0

  const forecast = []
  const now = new Date()
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
    forecast.push({
      month: d.toISOString().slice(0, 7),
      predicted_income: Math.round(avgIncome * 100) / 100,
      predicted_expense: Math.round(avgExpense * 100) / 100,
    })
  }
  return { forecast, historical: monthlyData }
}

export const getInsights = async (userId) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const topCategory = await Transaction.aggregate([
    { $match: { user_id: userId, type: 'expense', is_deleted: false, date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $limit: 1 },
  ])

  const totalExpense = await Transaction.aggregate([
    { $match: { user_id: userId, type: 'expense', is_deleted: false, date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])

  const avg = await Transaction.aggregate([
    { $match: { user_id: userId, is_deleted: false } },
    { $group: { _id: null, avg: { $avg: '$amount' } } },
  ])

  const freq = await Transaction.aggregate([
    { $match: { user_id: userId, is_deleted: false, date: { $gte: thirtyDaysAgo } } },
    { $group: { _id: '$type', cnt: { $sum: 1 } } },
  ])

  const insights = []
  if (topCategory.length > 0) {
    const catTotal = topCategory[0].total
    const expTotal = totalExpense[0]?.total || 1
    const pct = Math.round((catTotal / expTotal) * 100)
    insights.push({
      type: 'top_category',
      title: 'Top Category Spend',
      message: `Your top spending category is ${topCategory[0]._id} (${pct}% of recent spending).`,
      data: { category: topCategory[0]._id, total: catTotal, percentage: pct },
    })
  }

  if (avg.length > 0) {
    insights.push({
      type: 'average_transaction',
      title: 'Average Ticket Size',
      message: `Average transaction amount is $${parseFloat(avg[0].avg).toFixed(2)}.`,
      data: { avg: avg[0].avg },
    })
  }

  const freqMap = freq.reduce((a, b) => { a[b._id] = b.cnt; return a }, {})
  insights.push({
    type: 'frequency',
    title: 'Activity Breakdown',
    message: `${freqMap.income || 0} income inflows and ${freqMap.expense || 0} expense outflows in the last 30 days.`,
    data: freqMap,
  })

  return insights
}

/**
 * AI Spending Analysis (Section 11)
 * Analyzes transaction history: highest category, MoM surges, weekend vs weekday, subscriptions, impulse patterns.
 */
export const analyzeSpending = async (userId) => {
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const sixtyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  const allTxs = await Transaction.find({
    user_id: userId,
    is_deleted: false,
    date: { $gte: sixtyDaysAgo },
  }).sort({ date: -1 }).lean()

  const currentMonthTxs = allTxs.filter(t => new Date(t.date) >= currentMonthStart)
  const prevMonthTxs = allTxs.filter(t => new Date(t.date) >= prevMonthStart && new Date(t.date) < currentMonthStart)

  const curExpenses = currentMonthTxs.filter(t => t.type === 'expense')
  const prevExpenses = prevMonthTxs.filter(t => t.type === 'expense')

  const curTotalExp = curExpenses.reduce((s, t) => s + t.amount, 0)
  const prevTotalExp = prevExpenses.reduce((s, t) => s + t.amount, 0)

  // Category breakdowns
  const curCatMap = {}
  curExpenses.forEach(t => { curCatMap[t.category] = (curCatMap[t.category] || 0) + t.amount })

  const prevCatMap = {}
  prevExpenses.forEach(t => { prevCatMap[t.category] = (prevCatMap[t.category] || 0) + t.amount })

  const categoryAnalysis = Object.entries(curCatMap).map(([category, amount]) => {
    const prevAmount = prevCatMap[category] || 0
    const changePct = prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : (amount > 0 ? 100 : 0)
    return {
      category,
      currentAmount: amount,
      previousAmount: prevAmount,
      changePct,
      isIncrease: changePct > 0,
      shareOfTotal: curTotalExp > 0 ? Math.round((amount / curTotalExp) * 100) : 0,
    }
  }).sort((a, b) => b.currentAmount - a.currentAmount)

  const highestCategory = categoryAnalysis[0] || { category: 'None', currentAmount: 0, shareOfTotal: 0 }

  // Weekend vs Weekday analysis
  let weekendSpend = 0
  let weekdaySpend = 0
  let weekendCount = 0
  let weekdayCount = 0

  curExpenses.forEach(t => {
    const day = new Date(t.date).getDay()
    if (day === 0 || day === 6) {
      weekendSpend += t.amount
      weekendCount++
    } else {
      weekdaySpend += t.amount
      weekdayCount++
    }
  })

  // Subscription / Recurring patterns
  const subscriptionKeywords = ['netflix', 'spotify', 'youtube', 'prime', 'apple', 'gym', 'membership', 'cloud', 'sub', 'patreon', 'hotstar']
  const subscriptionTxs = curExpenses.filter(t => {
    const desc = t.description.toLowerCase()
    return subscriptionKeywords.some(kw => desc.includes(kw)) || t.recurrence !== 'none'
  })
  const totalSubscriptions = subscriptionTxs.reduce((s, t) => s + t.amount, 0)

  // Anomalies / High Spends
  const anomalies = await detectAnomalies(userId)

  // Actionable Suggestions
  const suggestions = []
  const foodCat = categoryAnalysis.find(c => /food|dining|restaurant/i.test(c.category))
  if (foodCat && foodCat.shareOfTotal > 25) {
    suggestions.push(`Food & dining accounts for ${foodCat.shareOfTotal}% of total spend. Setting a weekly dining cap could save up to ${Math.round(foodCat.currentAmount * 0.2)} this month.`)
  }
  if (weekendSpend > weekdaySpend) {
    suggestions.push(`Weekend spending (${Math.round(weekendSpend)}) is higher than weekday spending. Look out for social weekend leisure surges.`)
  }
  if (totalSubscriptions > 0) {
    suggestions.push(`You have ${subscriptionTxs.length} subscription/recurring charges totaling ${Math.round(totalSubscriptions)}. Review unused services periodically.`)
  }
  if (categoryAnalysis.some(c => c.changePct > 20 && c.currentAmount > 1000)) {
    const surging = categoryAnalysis.filter(c => c.changePct > 20 && c.currentAmount > 1000)
    suggestions.push(`Spending surged in ${surging.map(s => `${s.category} (+${s.changePct}%)`).join(', ')}.`)
  }
  if (suggestions.length === 0) {
    suggestions.push('Spending is stable. Maintaining current patterns will keep you on track with your monthly savings target.')
  }

  return {
    period: 'Current Month vs Previous Month',
    currentTotalExpense: curTotalExp,
    previousTotalExpense: prevTotalExp,
    overallChangePct: prevTotalExp > 0 ? Math.round(((curTotalExp - prevTotalExp) / prevTotalExp) * 100) : 0,
    highestSpendingCategory: highestCategory,
    categoryBreakdown: categoryAnalysis,
    weekendVsWeekday: {
      weekendTotal: weekendSpend,
      weekdayTotal: weekdaySpend,
      weekendAvgPerTx: weekendCount > 0 ? Math.round(weekendSpend / weekendCount) : 0,
      weekdayAvgPerTx: weekdayCount > 0 ? Math.round(weekdaySpend / weekdayCount) : 0,
      weekendPercentage: curTotalExp > 0 ? Math.round((weekendSpend / curTotalExp) * 100) : 0,
    },
    subscriptionAnalysis: {
      total: totalSubscriptions,
      count: subscriptionTxs.length,
      items: subscriptionTxs.map(s => ({ description: s.description, amount: s.amount, category: s.category })),
    },
    anomalies: anomalies.slice(0, 3),
    suggestions,
  }
}

/**
 * AI Expense Prediction (Section 12)
 * Predicts upcoming category and monthly expenses based on historical data.
 */
export const predictExpenses = async (userId, months = 3) => {
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const historical = await Transaction.find({
    user_id: userId,
    is_deleted: false,
    date: { $gte: ninetyDaysAgo },
  }).lean()

  const budgets = await Budget.find({ user_id: userId }).lean()
  const user = await User.findById(userId).lean()

  const monthlyMap = {}
  historical.forEach(t => {
    const m = new Date(t.date).toISOString().slice(0, 7)
    if (!monthlyMap[m]) monthlyMap[m] = { income: 0, expense: 0, categories: {} }
    if (t.type === 'expense') {
      monthlyMap[m].expense += t.amount
      monthlyMap[m].categories[t.category] = (monthlyMap[m].categories[t.category] || 0) + t.amount
    } else if (t.type === 'income') {
      monthlyMap[m].income += t.amount
    }
  })

  const historicalMonths = Object.keys(monthlyMap)
  const count = Math.max(historicalMonths.length, 1)

  const totalHistIncome = Object.values(monthlyMap).reduce((s, m) => s + m.income, 0)
  const totalHistExpense = Object.values(monthlyMap).reduce((s, m) => s + m.expense, 0)

  const avgIncome = user?.monthly_income || (totalHistIncome / count) || 50000
  const avgExpense = totalHistExpense / count || (avgIncome * 0.7)

  // Category averages
  const allCategories = new Set()
  Object.values(monthlyMap).forEach(m => Object.keys(m.categories).forEach(c => allCategories.add(c)))
  if (allCategories.size === 0) {
    ['Food & Dining', 'Transportation', 'Bills & Utilities', 'Shopping', 'Entertainment'].forEach(c => allCategories.add(c))
  }

  const categoryPredictions = Array.from(allCategories).map(cat => {
    const sum = Object.values(monthlyMap).reduce((s, m) => s + (m.categories[cat] || 0), 0)
    const expected = Math.round(sum / count) || Math.round(avgExpense / (allCategories.size || 1))
    const budget = budgets.find(b => b.category.toLowerCase() === cat.toLowerCase())
    const budgetLimit = budget?.limit_amount || 0
    const overrunRisk = budgetLimit > 0 && expected > budgetLimit

    return {
      category: cat,
      expectedMonthlyAmount: expected,
      budgetLimit,
      overrunRisk,
      overrunAmount: overrunRisk ? expected - budgetLimit : 0,
      riskLevel: overrunRisk ? (expected > budgetLimit * 1.2 ? 'high' : 'medium') : 'low',
    }
  }).sort((a, b) => b.expectedMonthlyAmount - a.expectedMonthlyAmount)

  // Monthly predictions
  const monthlyPredictions = []
  const now = new Date()
  for (let i = 1; i <= months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const predictedExp = Math.round(avgExpense * (1 + (i * 0.01))) // modest inflation adjustment
    const predictedInc = Math.round(avgIncome)
    const predictedSavings = Math.max(0, predictedInc - predictedExp)

    monthlyPredictions.push({
      month: d.toISOString().slice(0, 7),
      monthLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      expectedIncome: predictedInc,
      expectedExpense: predictedExp,
      expectedSavings: predictedSavings,
      expectedSavingsRate: predictedInc > 0 ? Math.round((predictedSavings / predictedInc) * 100) : 0,
    })
  }

  const isLimitedData = historicalMonths.length < 2

  return {
    isLimitedData,
    confidenceScore: isLimitedData ? 65 : 88,
    dataSummary: `Based on ${historicalMonths.length} month(s) of spending history.`,
    monthlyPredictions,
    categoryPredictions,
    potentialOverruns: categoryPredictions.filter(c => c.overrunRisk),
  }
}

/**
 * AI Saving Recommendations (Section 13)
 * Provides personalized cost-saving opportunities with estimated monthly savings.
 */
export const getSavingRecommendations = async (userId) => {
  const user = await User.findById(userId).lean()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentTxs = await Transaction.find({
    user_id: userId,
    is_deleted: false,
    date: { $gte: thirtyDaysAgo },
  }).lean()

  const expenses = recentTxs.filter(t => t.type === 'expense')
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const income = user?.monthly_income || 50000

  // Category totals
  const catTotals = {}
  expenses.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })

  const recommendations = []
  let totalPotentialSaving = 0

  // 1. Food Delivery / Dining
  const foodSpend = Object.entries(catTotals).filter(([c]) => /food|dining|restaurant|swiggy|zomato/i.test(c)).reduce((s, [, v]) => s + v, 0)
  if (foodSpend > 3000) {
    const saving = Math.round(foodSpend * 0.25)
    totalPotentialSaving += saving
    recommendations.push({
      id: 'rec_food',
      category: 'Food & Dining',
      icon: '🍔',
      title: 'Optimize Food Delivery & Dining',
      description: `You spent approx ${Math.round(foodSpend)} on food and dining this month. Cooking at home 2 more days per week can easily save ~${saving}/month.`,
      potentialMonthlySaving: saving,
      difficulty: 'Easy',
      impact: 'High',
    })
  }

  // 2. Shopping & Impulse Purchases
  const shoppingSpend = Object.entries(catTotals).filter(([c]) => /shopping|clothes|electronics|amazon/i.test(c)).reduce((s, [, v]) => s + v, 0)
  if (shoppingSpend > 2500) {
    const saving = Math.round(shoppingSpend * 0.3)
    totalPotentialSaving += saving
    recommendations.push({
      id: 'rec_shopping',
      category: 'Shopping',
      icon: '🛍️',
      title: 'Adopt the 48-Hour Rule for Shopping',
      description: `Non-essential shopping reached ${Math.round(shoppingSpend)}. Waiting 48 hours before discretionary checkouts helps avoid impulse buys.`,
      potentialMonthlySaving: saving,
      difficulty: 'Medium',
      impact: 'Medium',
    })
  }

  // 3. Subscriptions & Digital Services
  const subSpend = Object.entries(catTotals).filter(([c]) => /bills|entertainment|subscription/i.test(c)).reduce((s, [, v]) => s + v, 0)
  if (subSpend > 1500) {
    const saving = Math.round(subSpend * 0.2)
    totalPotentialSaving += saving
    recommendations.push({
      id: 'rec_subscriptions',
      category: 'Subscriptions',
      icon: '📺',
      title: 'Audit Inactive Subscriptions',
      description: `Subscriptions & digital entertainment cost ${Math.round(subSpend)}. Pausing 1 or 2 unused streaming tiers saves recurring cash.`,
      potentialMonthlySaving: saving,
      difficulty: 'Easy',
      impact: 'Medium',
    })
  }

  // 4. Transportation
  const transportSpend = Object.entries(catTotals).filter(([c]) => /transport|cab|uber|ola|fuel/i.test(c)).reduce((s, [, v]) => s + v, 0)
  if (transportSpend > 2000) {
    const saving = Math.round(transportSpend * 0.2)
    totalPotentialSaving += saving
    recommendations.push({
      id: 'rec_transport',
      category: 'Transportation',
      icon: '🚗',
      title: 'Carpooling & Public Transit Optimization',
      description: `Ride-hailing and transit costs hit ${Math.round(transportSpend)}. Combining trips and using metro/carpool can save ~${saving}.`,
      potentialMonthlySaving: saving,
      difficulty: 'Medium',
      impact: 'Low',
    })
  }

  // Fallback if no high spends yet
  if (recommendations.length === 0) {
    const baseline = Math.round(income * 0.08)
    totalPotentialSaving = baseline
    recommendations.push({
      id: 'rec_general',
      category: 'General Savings',
      icon: '🌱',
      title: 'Automated 10% Savings Rule',
      description: 'Transfer 10% of your paycheck directly into a high-yield savings or emergency fund immediately upon receipt.',
      potentialMonthlySaving: baseline,
      difficulty: 'Easy',
      impact: 'High',
    })
  }

  return {
    currentMonthlySpending: totalExpense,
    totalPotentialMonthlySaving: totalPotentialSaving,
    optimizedMonthlySpending: Math.max(0, totalExpense - totalPotentialSaving),
    yearlySavingsMultiplier: totalPotentialSaving * 12,
    recommendations,
  }
}

async function callGeminiAPI(systemPrompt, userMessage, conversationHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  if (!apiKey) return null

  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.7-flash']

  try {
    const contents = []

    if (Array.isArray(conversationHistory)) {
      conversationHistory.slice(-6).forEach((msg) => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })
      })
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    })

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }

    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          const data = await res.json()
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) return text.trim()
        }
      } catch (e) {
        console.warn(`[Gemini API] Error trying model ${model}:`, e.message)
      }
    }

    return null
  } catch (err) {
    console.warn('[Gemini API] Exception:', err.message)
    return null
  }
}

/**
 * AI Financial Assistant Chat (Section 14)
 * Real-time contextual chatbot powered by Google Gemini AI with local deterministic fallback.
 */
export const aiChat = async (userId, userMessage, conversationHistory = []) => {
  const user = await User.findById(userId).lean()
  const now = new Date()
  const currentMonthStr = now.toISOString().slice(0, 7)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [allTxs, budgets, goals, recurring] = await Promise.all([
    Transaction.find({ user_id: userId, is_deleted: false }).sort({ date: -1 }).limit(100).lean(),
    Budget.find({ user_id: userId }).lean(),
    Goal.find({ user_id: userId }).lean(),
    RecurringTemplate.find({ user_id: userId, is_active: true }).lean(),
  ])

  const curMonthTxs = allTxs.filter(t => new Date(t.date) >= currentMonthStart)
  const prevMonthTxs = allTxs.filter(t => new Date(t.date) >= prevMonthStart && new Date(t.date) < currentMonthStart)

  const curIncome = curMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const curExpense = curMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const curBalance = curIncome - curExpense
  const savingsRate = curIncome > 0 ? Math.round(((curIncome - curExpense) / curIncome) * 100) : 0

  const prevIncome = prevMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense = prevMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  // Category breakdown for current month
  const categoryMap = {}
  curMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount
  })
  const sortedCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])
  const topCat = sortedCategories[0] || ['None', 0]

  const currency = user?.preferred_currency || 'INR'
  const symbol = currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ')

  // 1. Try Live Google Gemini LLM with Real-time Context
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY
  if (apiKey) {
    const financialContext = `
USER FINANCIAL DATA SNAPSHOT:
• Currency: ${currency} (${symbol})
• Monthly Income: ${symbol}${curIncome.toLocaleString()}
• Monthly Expenses: ${symbol}${curExpense.toLocaleString()}
• Net Available Balance: ${symbol}${curBalance.toLocaleString()}
• Current Savings Rate: ${savingsRate}%
• Category Spending: ${sortedCategories.map(([cat, amt]) => `${cat}: ${symbol}${amt}`).join(', ') || 'None yet'}
• Top Category: ${topCat[0]} (${symbol}${topCat[1]})
• Active Category Budgets: ${budgets.map(b => `${b.category}: limit ${symbol}${b.limit_amount}`).join(', ') || 'None set'}
• Active Financial Goals: ${goals.map(g => `${g.name}: ${symbol}${g.current_amount}/${symbol}${g.target_amount}`).join(', ') || 'None'}
• Recent 5 Transactions: ${curMonthTxs.slice(0, 5).map(t => `${t.description} (${t.category}): ${symbol}${t.amount} [${t.type}] on ${new Date(t.date).toLocaleDateString()}`).join('; ') || 'No transactions'}
`

    const systemPrompt = `You are Expense Tracker AI, an expert personal financial advisor and expense tracking intelligence engine.
You have real-time access to the user's live financial data snapshot below.
Provide direct, highly accurate, concise, helpful, and motivating financial advice.
Format your responses with clean Markdown (bolding key numbers and metrics, using bullet points where helpful). Always refer to amounts using the user's currency symbol (${symbol}).

${financialContext}`

    const geminiReply = await callGeminiAPI(systemPrompt, userMessage, conversationHistory)
    if (geminiReply) {
      return {
        reply: geminiReply,
        quickStats: { income: curIncome, expense: curExpense, balance: curBalance },
        timestamp: new Date().toISOString(),
      }
    }
  }

  const q = userMessage.toLowerCase()

  let reply = ''
  let quickStats = null

  // 1. "How much did I spend this month?"
  if (/how much (did i|have i|i) spend|total expense|current spend/i.test(q)) {
    reply = `You have spent **${symbol}${curExpense.toLocaleString()}** this month across ${curMonthTxs.filter(t => t.type === 'expense').length} expense transactions.\n\n`
    if (curIncome > 0) {
      reply += `• Total Income: **${symbol}${curIncome.toLocaleString()}**\n• Net Balance Remaining: **${symbol}${curBalance.toLocaleString()}**\n• Savings Rate: **${savingsRate}%**`
    }
    quickStats = { income: curIncome, expense: curExpense, balance: curBalance }
  }

  // 2. "Where am I spending the most?" / "Top category"
  else if (/where am i spending|top (spending|category|expense)|highest spend/i.test(q)) {
    if (sortedCategories.length === 0) {
      reply = `You don't have any recorded expenses for this month yet. Add a transaction to see your spending breakdown!`
    } else {
      reply = `Your top spending category is **${topCat[0]}** with **${symbol}${topCat[1].toLocaleString()}** (${Math.round((topCat[1] / (curExpense || 1)) * 100)}% of total expenses).\n\n**Top Categories this month:**\n`
      sortedCategories.slice(0, 5).forEach(([cat, amt], i) => {
        reply += `${i + 1}. **${cat}**: ${symbol}${amt.toLocaleString()} (${Math.round((amt / (curExpense || 1)) * 100)}%)\n`
      })
    }
  }

  // 3. "Can I afford ₹X?" / "Can I buy X for Y?"
  else if (/can i afford|can i buy|afford (a|an|\$|₹|[0-9])/i.test(q)) {
    const match = q.match(/(?:afford|buy|purchase|spend)\s*(?:a|an)?\s*(?:[a-z\s]+)?(?:for|of)?\s*[\$₹]?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/i)
    const amountToTest = match ? parseFloat(match[1].replace(/,/g, '')) : 5000

    const monthlyBudgetLimit = budgets.reduce((s, b) => s + b.limit_amount, 0)
    const availableSafeBalance = Math.max(0, curIncome > 0 ? (curIncome - curExpense) : (monthlyBudgetLimit - curExpense))
    const isAffordable = availableSafeBalance >= amountToTest

    if (isAffordable) {
      const remainingAfter = availableSafeBalance - amountToTest
      reply = `✅ **Yes, you can afford a ${symbol}${amountToTest.toLocaleString()} purchase.**\n\n`
      reply += `• Current available balance/budget: **${symbol}${availableSafeBalance.toLocaleString()}**\n`
      reply += `• Remaining balance after purchase: **${symbol}${remainingAfter.toLocaleString()}**\n`
      reply += `• Impact on monthly savings: Your projected savings will adjust from ${symbol}${curBalance.toLocaleString()} to ${symbol}${(curBalance - amountToTest).toLocaleString()}.`
    } else {
      const shortage = amountToTest - availableSafeBalance
      reply = `⚠️ **Caution: Purchasing ${symbol}${amountToTest.toLocaleString()} may strain your budget.**\n\n`
      reply += `• Current available margin: **${symbol}${availableSafeBalance.toLocaleString()}**\n`
      reply += `• Shortfall: **${symbol}${shortage.toLocaleString()}**\n`
      reply += `Consider postponing this discretionary expense or allocating from your flexible wants budget.`
    }
  }

  // 4. "How much can I save this month?"
  else if (/how much can i save|potential savings|how much to save/i.test(q)) {
    const projectedSavings = Math.max(0, curBalance)
    reply = `Based on your current month's inflows of **${symbol}${curIncome.toLocaleString()}** and outflows of **${symbol}${curExpense.toLocaleString()}**, your current net savings is **${symbol}${projectedSavings.toLocaleString()}** (${savingsRate}% savings rate).\n\n`
    if (user?.monthly_savings_goal) {
      const goalDiff = user.monthly_savings_goal - projectedSavings
      if (goalDiff <= 0) {
        reply += `🎉 You have reached your monthly target of ${symbol}${user.monthly_savings_goal.toLocaleString()}!`
      } else {
        reply += `🎯 You are ${symbol}${goalDiff.toLocaleString()} away from your monthly savings goal of ${symbol}${user.monthly_savings_goal.toLocaleString()}.`
      }
    }
  }

  // 5. "Why did my expenses increase?" / "Compare with last month"
  else if (/why did my expenses increase|compare (this|with) last month|increase in expense|vs last month/i.test(q)) {
    const diff = curExpense - prevExpense
    const isHigher = diff > 0
    reply = `📊 **Month-over-Month Comparison:**\n\n`
    reply += `• **This Month Expenses:** ${symbol}${curExpense.toLocaleString()}\n`
    reply += `• **Last Month Expenses:** ${symbol}${prevExpense.toLocaleString()}\n`
    reply += `• **Difference:** ${isHigher ? '+' : ''}${symbol}${diff.toLocaleString()} (${prevExpense > 0 ? Math.round((diff / prevExpense) * 100) : 0}%)\n\n`

    if (isHigher) {
      reply += `The increase is primarily driven by categories with recent activity. Check your top category **${topCat[0]}** (${symbol}${topCat[1].toLocaleString()}) for potential optimization.`
    } else {
      reply += `Great job! Your spending is currently lower than last month's total.`
    }
  }

  // 6. "Show top 5 expenses" / "List recent expenses"
  else if (/top (5|five|10|ten)?\s*expenses|largest transactions|biggest expense/i.test(q)) {
    const topTxs = curMonthTxs.filter(t => t.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5)
    if (topTxs.length === 0) {
      reply = `You haven't logged any expense transactions this month.`
    } else {
      reply = `Here are your **top ${topTxs.length} largest expenses this month:**\n\n`
      topTxs.forEach((t, idx) => {
        reply += `${idx + 1}. **${t.description}** (${t.category}) — **${symbol}${t.amount.toLocaleString()}** on ${new Date(t.date).toLocaleDateString()}\n`
      })
    }
  }

  // 7. Specific category query (e.g. "How much did I spend on Food?")
  else if (/how much (did i|have i)?\s*(spend|spent) on ([a-z\s&]+)/i.test(q)) {
    const match = q.match(/on\s+([a-z\s&]+)/i)
    const searchCat = match ? match[1].trim().toLowerCase() : ''
    const matchedCategory = Object.keys(categoryMap).find(c => c.toLowerCase().includes(searchCat))

    if (matchedCategory) {
      const amt = categoryMap[matchedCategory]
      const txs = curMonthTxs.filter(t => t.category.toLowerCase() === matchedCategory.toLowerCase())
      reply = `You have spent **${symbol}${amt.toLocaleString()}** on **${matchedCategory}** this month across ${txs.length} transactions.\n\n`
      reply += `This accounts for **${Math.round((amt / (curExpense || 1)) * 100)}%** of your total monthly expenditures.`
    } else {
      reply = `I couldn't find any expenses recorded under "${searchCat}" this month. Your active categories this month are: ${Object.keys(categoryMap).join(', ') || 'None'}.`
    }
  }

  // 8. "Create a budget for me" / "Budget recommendations"
  else if (/create (a )?budget|recommend (a )?budget|budget plan/i.test(q)) {
    const salary = user?.monthly_income || (curIncome > 0 ? curIncome : 50000)
    const needs = Math.round(salary * 0.50)
    const wants = Math.round(salary * 0.30)
    const savings = Math.round(salary * 0.20)

    reply = `💡 **Recommended 50/30/20 Budget Plan for Income ${symbol}${salary.toLocaleString()}:**\n\n`
    reply += `1. **Essential Needs (50%):** ${symbol}${needs.toLocaleString()}/mo (Rent, Utilities, Groceries, Transport)\n`
    reply += `2. **Discretionary Wants (30%):** ${symbol}${wants.toLocaleString()}/mo (Dining out, Entertainment, Shopping)\n`
    reply += `3. **Savings & Goals (20%):** ${symbol}${savings.toLocaleString()}/mo (Emergency fund, Investments)\n\n`
    reply += `You can customize and generate your full category budget in the **AI Budget Planner** tab!`
  }

  // 9. Goals / Financial Targets query
  else if (/goal|financial target|how are my goals/i.test(q)) {
    if (goals.length === 0) {
      reply = `You haven't set any financial goals yet. Create a goal like "Emergency Fund" or "Vacation" in the Goals section to start tracking!`
    } else {
      reply = `🎯 **Your Active Financial Goals:**\n\n`
      goals.forEach(g => {
        const pct = Math.round((g.current_amount / g.target_amount) * 100)
        reply += `• **${g.name}**: ${symbol}${g.current_amount.toLocaleString()} / ${symbol}${g.target_amount.toLocaleString()} (${pct}% completed)\n`
      })
    }
  }

  // 10. General conversational fallback grounded in user data
  else {
    reply = `I'm your AI Financial Assistant! Based on your current finances:\n\n`
    reply += `• **Income:** ${symbol}${curIncome.toLocaleString()}\n`
    reply += `• **Expenses:** ${symbol}${curExpense.toLocaleString()}\n`
    reply += `• **Top Category:** ${topCat[0]} (${symbol}${topCat[1].toLocaleString()})\n`
    reply += `• **Active Budgets:** ${budgets.length} categories monitored\n\n`
    reply += `Feel free to ask me questions like:\n`
    reply += `• *"How much did I spend this month?"*\n`
    reply += `• *"Can I afford a ${symbol}5,000 purchase?"*\n`
    reply += `• *"Where am I spending the most?"*\n`
    reply += `• *"Compare this month with last month"*\n`
    reply += `• *"How much can I save this month?"*`
  }

  return {
    reply,
    quickStats,
    timestamp: new Date().toISOString(),
  }
}
