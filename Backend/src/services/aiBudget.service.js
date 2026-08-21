import { Transaction } from '../models/Transaction.js'

function round2(n) { return Math.round(n * 100) / 100 }
function pct(n, t) { return t > 0 ? round2((n / t) * 100) : 0 }

const NEED_CATS = ['Food', 'Bills', 'Health', 'Education', 'Transport']
const WANT_CATS = ['Entertainment', 'Shopping', 'Travel']

function ageGroup(age) {
  if (age <= 25) return 'young'
  if (age <= 45) return 'working'
  return 'senior'
}

async function getSpendingHistory(userId) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const rows = await Transaction.aggregate([
    { $match: { user_id: userId, is_deleted: false, date: { $gte: sixMonthsAgo } } },
    { $group: {
      _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type', category: '$category' },
      total: { $sum: '$amount' }, count: { $sum: 1 }
    }},
    { $sort: { '_id.month': 1 } },
  ])

  const monthly = {}
  const months = new Set()
  rows.forEach(r => {
    const m = r._id.month
    months.add(m)
    if (!monthly[m]) monthly[m] = { income: 0, expense: 0, categories: {} }
    if (r._id.type === 'income') monthly[m].income += r.total
    else {
      monthly[m].expense += r.total
      monthly[m].categories[r._id.category] = (monthly[m].categories[r._id.category] || 0) + r.total
    }
  })

  const monthCount = Math.max(months.size, 1)
  const sortedMonths = [...months].sort()
  const catAvg = {}
  let totalIncome = 0, totalExpense = 0

  sortedMonths.forEach(m => {
    totalIncome += monthly[m].income
    totalExpense += monthly[m].expense
    Object.entries(monthly[m].categories).forEach(([c, v]) => {
      catAvg[c] = (catAvg[c] || 0) + v
    })
  })

  for (const c in catAvg) catAvg[c] = round2(catAvg[c] / monthCount)

  const trend = sortedMonths.map(m => ({
    month: m,
    income: round2(monthly[m].income),
    expense: round2(monthly[m].expense),
  }))

  const prevMonth = sortedMonths.length >= 2 ? sortedMonths[sortedMonths.length - 2] : null
  const curMonth = sortedMonths.length >= 1 ? sortedMonths[sortedMonths.length - 1] : null
  const prevExp = prevMonth ? monthly[prevMonth].expense : 0
  const curExp = curMonth ? monthly[curMonth].expense : 0
  const trendChange = prevExp > 0 ? round2(((curExp - prevExp) / prevExp) * 100) : 0

  return {
    avgIncome: round2(totalIncome / monthCount),
    avgExpense: round2(totalExpense / monthCount),
    catAvg,
    trend,
    trendChange,
    monthCount,
    hasData: monthCount > 0,
  }
}

function calcBudget(input, history) {
  const { age, monthlySalary, monthlyExpenses, savingsGoal, financialGoal } = input
  const totalIncome = monthlySalary
  const userExpenses = Math.max(0, monthlyExpenses || 0)
  const goal = Math.max(0, savingsGoal || 0)
  const available = Math.max(0, totalIncome - userExpenses)

  const ag = ageGroup(age || 30)
  const hasHistory = history.hasData

  const actualExpense = hasHistory ? history.avgExpense : userExpenses
  const actualIncome = hasHistory && history.avgIncome > 0 ? Math.max(history.avgIncome, totalIncome) : totalIncome
  const currentCatSpending = hasHistory ? history.catAvg : {}

  const goalMultipliers = {
    'emergency fund': { savings: 0.12, emergency: 0.18, flex: 0.05 },
    'savings': { savings: 0.20, emergency: 0.08, flex: 0.05 },
    'debt repayment': { savings: 0.10, emergency: 0.05, flex: 0.03 },
    'investment': { savings: 0.18, emergency: 0.07, flex: 0.05 },
    'home purchase': { savings: 0.22, emergency: 0.05, flex: 0.03 },
    'retirement': { savings: 0.20, emergency: 0.10, flex: 0.05 },
    'travel': { savings: 0.12, emergency: 0.06, flex: 0.10 },
    'education': { savings: 0.15, emergency: 0.05, flex: 0.05 },
  }
  const gm = goalMultipliers[financialGoal] || goalMultipliers['savings']

  let basePcts = {
    housing: 30, food: 15, transport: 7, education: 4, bills: 8, shopping: 5,
    entertainment: 5, savings: gm.savings * 100, emergency: gm.emergency * 100,
    travel: 4, other: gm.flex * 100,
  }

  if (ag === 'young') {
    basePcts.housing = 28; basePcts.education = 6; basePcts.entertainment = 6
    basePcts.savings = Math.max(basePcts.savings, 12); basePcts.emergency = Math.max(basePcts.emergency, 10)
  } else if (ag === 'senior') {
    basePcts.housing = 32; basePcts.entertainment = 3; basePcts.shopping = 3
    basePcts.savings = Math.max(basePcts.savings, 18); basePcts.emergency = Math.max(basePcts.emergency, 10)
  }

  if (actualExpense >= actualIncome * 0.9) {
    basePcts.savings = Math.max(basePcts.savings, 8)
    basePcts.emergency = Math.max(basePcts.emergency, 5)
    basePcts.entertainment = Math.min(basePcts.entertainment, 3)
    basePcts.shopping = Math.min(basePcts.shopping, 3)
    basePcts.travel = Math.min(basePcts.travel, 2)
  }

  if (goal > 0) {
    const extra = Math.min(pct(goal, actualIncome), 15)
    if (extra > basePcts.savings) {
      const diff = extra - basePcts.savings
      basePcts.savings = extra
      basePcts.entertainment = Math.max(2, basePcts.entertainment - Math.ceil(diff / 2))
      basePcts.shopping = Math.max(2, basePcts.shopping - Math.floor(diff / 2))
    }
  }

  const total = Object.values(basePcts).reduce((s, v) => s + v, 0)
  const scale = 100 / total

  const categoryMap = {
    housing: { name: 'Housing', emoji: '🏠' },
    food: { name: 'Food', emoji: '🍔' },
    transport: { name: 'Transport', emoji: '🚗' },
    education: { name: 'Education', emoji: '🎓' },
    bills: { name: 'Bills', emoji: '💡' },
    shopping: { name: 'Shopping', emoji: '🛍️' },
    entertainment: { name: 'Entertainment', emoji: '🎮' },
    savings: { name: 'Savings', emoji: '💰' },
    emergency: { name: 'Emergency Fund', emoji: '🆘' },
    travel: { name: 'Travel', emoji: '✈️' },
    other: { name: 'Other', emoji: '📌' },
  }

  const needCats = ['housing', 'food', 'transport', 'education', 'bills']
  const wantCats = ['shopping', 'entertainment', 'travel']

  const categories = Object.entries(basePcts).map(([key, p]) => {
    const info = categoryMap[key]
    const recommended = round2(actualIncome * p * scale / 100)
    const currentSpending = currentCatSpending[info.name] || (key === 'savings' ? 0 : 0)
    const difference = round2(recommended - currentSpending)
    const group = needCats.includes(key) ? 'need' : wantCats.includes(key) ? 'want' : 'goal'

    let suggestion = ''
    if (key === 'savings') {
      if (goal > 0) suggestion = `Save Rs. ${recommended.toLocaleString('en-IN')}/month to reach your goal.`
      else suggestion = `Aim to save Rs. ${recommended.toLocaleString('en-IN')}/month for financial security.`
    } else if (key === 'emergency') {
      suggestion = `Set aside Rs. ${recommended.toLocaleString('en-IN')}/month for emergencies.`
    } else if (currentSpending > recommended && currentSpending > 0) {
      suggestion = `Reduce by Rs. ${Math.abs(difference).toLocaleString('en-IN')} to match recommended budget.`
    } else if (currentSpending > 0) {
      suggestion = `Current spending is within the recommended budget.`
    } else {
      suggestion = `Recommended allocation: Rs. ${recommended.toLocaleString('en-IN')}/month.`
    }

    return { key, ...info, recommended, recommendedPct: round2(p * scale), currentSpending, difference, group, suggestion }
  })

  const totalNeeds = categories.filter(c => c.group === 'need').reduce((s, c) => s + c.recommended, 0)
  const totalWants = categories.filter(c => c.group === 'want').reduce((s, c) => s + c.recommended, 0)
  const totalGoals = categories.filter(c => c.group === 'goal').reduce((s, c) => s + c.recommended, 0)
  const savingsAmt = categories.find(c => c.name === 'Savings').recommended
  const emergencyAmt = categories.find(c => c.name === 'Emergency Fund').recommended
  const flexAmt = categories.filter(c => c.group === 'want').reduce((s, c) => s + c.recommended, 0)
  const savingsRate = pct(savingsAmt, actualIncome)

  let tip = ''
  if (actualExpense >= actualIncome * 0.9) {
    tip = `Your expenses are high. Focus on reducing avoidable costs. Even saving Rs. ${savingsAmt.toLocaleString('en-IN')}/month makes a difference.`
  } else if (goal > 0) {
    tip = `Save Rs. ${savingsAmt.toLocaleString('en-IN')}/month and keep flexible spending below Rs. ${flexAmt.toLocaleString('en-IN')} to reach your ${financialGoal} goal.`
  } else if (savingsRate >= 20) {
    tip = `Excellent savings rate of ${savingsRate}%! Keep this up and consider investing surplus funds.`
  } else {
    tip = `Try to save Rs. ${savingsAmt.toLocaleString('en-IN')}/month (${savingsRate}% of income) and keep flexible spending under Rs. ${flexAmt.toLocaleString('en-IN')}.`
  }

  const insights = []
  if (savingsRate >= 20) insights.push({ type: 'positive', title: 'Strong Savings', message: `Your ${savingsRate}% savings rate is excellent. You're building wealth consistently.` })
  else if (savingsRate >= 10) insights.push({ type: 'info', title: 'Moderate Savings', message: `At ${savingsRate}%, you're saving well. Pushing to 20% would accelerate your goals.` })
  else insights.push({ type: 'warning', title: 'Low Savings', message: `Only ${savingsRate}% savings rate. Try to cut discretionary spending to build a safety net.` })

  if (hasHistory && history.trendChange > 20) insights.push({ type: 'warning', title: 'Spending Surge', message: `Expenses jumped ${history.trendChange}% last month. Review recent transactions.` })
  else if (hasHistory && history.trendChange < -10) insights.push({ type: 'positive', title: 'Spending Down', message: `Expenses decreased ${Math.abs(history.trendChange)}% last month. Great progress!` })

  const topSpender = categories.filter(c => c.currentSpending > c.recommended && c.currentSpending > 0)
  if (topSpender.length > 0) {
    insights.push({ type: 'alert', title: 'Over Budget', message: `${topSpender[0].name} spending (Rs. ${topSpender[0].currentSpending.toLocaleString('en-IN')}) exceeds the recommended Rs. ${topSpender[0].recommended.toLocaleString('en-IN')}.` })
  }

  if (goal > 0) {
    const monthsToGoal = savingsAmt > 0 ? Math.ceil(goal / savingsAmt) : 999
    insights.push({ type: 'goal', title: 'Goal Timeline', message: `At Rs. ${savingsAmt.toLocaleString('en-IN')}/month, you'll reach your Rs. ${goal.toLocaleString('en-IN')} goal in ~${monthsToGoal} months.` })
  }

  if (emergencyAmt > 0) {
    const emergencyMonthsTarget = 6
    const totalEmergencyTarget = actualIncome * emergencyMonthsTarget
    insights.push({ type: 'info', title: 'Emergency Fund', message: `Saving Rs. ${emergencyAmt.toLocaleString('en-IN')}/month builds a ${emergencyMonthsTarget}-month safety net over time.` })
  }

  let score = 50
  if (savingsRate >= 20) score += 15
  else if (savingsRate >= 10) score += 8
  else if (savingsRate < 5) score -= 5
  if (actualExpense <= actualIncome * 0.7) score += 15
  else if (actualExpense <= actualIncome * 0.85) score += 8
  else if (actualExpense > actualIncome * 0.95) score -= 10
  if (emergencyAmt > 0) score += 5
  if (savingsAmt > 0 && emergencyAmt > 0) score += 5
  if (hasHistory && history.trendChange < 0) score += 5
  score = Math.max(0, Math.min(100, Math.round(score)))

  const result = {
    monthly: {
      income: actualIncome,
      expenses: actualExpense,
      available: round2(actualIncome - actualExpense),
      categories,
      needs: round2(totalNeeds),
      wants: round2(totalWants),
      goals: round2(totalGoals),
      savings: savingsAmt,
      emergencyFund: emergencyAmt,
      flexibleSpending: flexAmt,
      savingsRate,
      tip,
    },
    trend: hasHistory ? history.trend : [],
    insights,
    score,
    disclaimer: 'AI-generated budget suggestions for planning purposes only. Not financial advice.',
  }

  return result
}

export async function generateBudget(userId, input) {
  const history = await getSpendingHistory(userId)
  return calcBudget(input, history)
}
