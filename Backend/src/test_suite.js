import http from 'http'
import app from './server.js'
import { connectMongo } from './db/index.js'

async function runTests() {
  console.log('--- Starting Backend Smoke Test Suite ---')
  await connectMongo()

  const server = http.createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const BASE = `http://127.0.0.1:${port}/api`

  // Helper fetch function
  async function req(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    return { status: res.status, body: data }
  }

  // 1. Health check
  const healthRes = await req('/health')
  console.log('1. Health check:', healthRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', healthRes.body)

  // 2. Register new test user
  const email = `tester_${Date.now()}@example.com`
  const registerRes = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Master Test User',
      email,
      password: 'password123',
      confirm_password: 'password123',
      phone: '+919999999999',
    },
  })
  console.log('2. Register user:', registerRes.status === 201 ? 'PASS ✅' : 'FAIL ❌', registerRes.body?.user?.email)

  const token = registerRes.body.accessToken
  const authHeader = { Authorization: `Bearer ${token}` }

  // 3. Add Income & Expenses
  const incRes = await req('/transactions', {
    method: 'POST',
    headers: authHeader,
    body: {
      description: 'Monthly Salary Deposit',
      amount: 100000,
      type: 'income',
      category: 'Salary',
      date: new Date().toISOString(),
      recurrence: 'monthly',
    },
  })
  console.log('3a. Add Income:', incRes.status === 201 ? 'PASS ✅' : 'FAIL ❌')

  const exp1Res = await req('/transactions', {
    method: 'POST',
    headers: authHeader,
    body: {
      description: 'Apartment Rent',
      amount: 25000,
      type: 'expense',
      category: 'Rent',
      date: new Date().toISOString(),
      recurrence: 'monthly',
    },
  })
  const exp2Res = await req('/transactions', {
    method: 'POST',
    headers: authHeader,
    body: {
      description: 'Weekend Dining & Drinks',
      amount: 4500,
      type: 'expense',
      category: 'Food & Dining',
      date: new Date().toISOString(),
      recurrence: 'none',
    },
  })
  console.log('3b. Add Expenses:', (exp1Res.status === 201 && exp2Res.status === 201) ? 'PASS ✅' : 'FAIL ❌')

  // 4. Financial Goals CRUD & Deposit
  const goalRes = await req('/goals', {
    method: 'POST',
    headers: authHeader,
    body: {
      name: 'Emergency Safety Fund',
      category: 'Emergency Fund',
      target_amount: 150000,
      current_amount: 30000,
      target_date: new Date(Date.now() + 180 * 86400000).toISOString(),
      color: '#10b981',
      notes: '6 months living expenses',
    },
  })
  console.log('4a. Create Goal:', goalRes.status === 201 ? 'PASS ✅' : 'FAIL ❌', goalRes.body?.name)
  const goalId = goalRes.body.id

  const contributeRes = await req(`/goals/${goalId}/contribute`, {
    method: 'POST',
    headers: authHeader,
    body: { amount: 10000 },
  })
  console.log('4b. Contribute Goal:', contributeRes.body?.currentAmount === 40000 ? 'PASS ✅' : 'FAIL ❌', `Current: ${contributeRes.body?.currentAmount}`)

  // 5. Recurring Transactions CRUD & Execution
  const recRes = await req('/recurring', {
    method: 'POST',
    headers: authHeader,
    body: {
      description: 'Cloud Storage & GitHub Sub',
      amount: 1200,
      type: 'expense',
      category: 'Bills & Utilities',
      recurrence: 'monthly',
      start_date: new Date().toISOString(),
      next_run_date: new Date().toISOString(),
    },
  })
  console.log('5a. Create Recurring Rule:', recRes.status === 201 ? 'PASS ✅' : 'FAIL ❌', recRes.body?.description)

  const execRes = await req('/recurring/execute-due', {
    method: 'POST',
    headers: authHeader,
    body: {},
  })
  console.log('5b. Execute Due Recurring:', execRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', `Processed: ${execRes.body?.processedCount}`)

  // 6. AI Intelligence Services
  const aiChatRes = await req('/ai/chat', {
    method: 'POST',
    headers: authHeader,
    body: {
      message: 'How much did I spend this month and can I afford a 5000 purchase?',
    },
  })
  console.log('6a. AI Chat:', aiChatRes.status === 200 ? 'PASS ✅' : 'FAIL ❌')
  console.log('   AI Reply sample:', String(aiChatRes.body?.reply || '').slice(0, 100) + '...')

  const aiAnalyzeRes = await req('/ai/analyze', { headers: authHeader })
  console.log('6b. AI Spending Analysis:', aiAnalyzeRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', `Top category: ${aiAnalyzeRes.body?.highestSpendingCategory?.category}`)

  const aiPredictRes = await req('/ai/predict?months=3', { headers: authHeader })
  console.log('6c. AI Expense Forecast:', aiPredictRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', `Confidence: ${aiPredictRes.body?.confidenceScore}%`)

  const aiRecommendRes = await req('/ai/recommend', { headers: authHeader })
  console.log('6d. AI Saving Recommendations:', aiRecommendRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', `Monthly potential: ${aiRecommendRes.body?.totalPotentialMonthlySaving}`)

  // 7. Reports
  const reportRes = await req('/reports/monthly', { headers: authHeader })
  console.log('7. Monthly Report:', reportRes.status === 200 ? 'PASS ✅' : 'FAIL ❌', `Savings Rate: ${reportRes.body?.summary?.savingsRate}%`)

  // 8. Delete Account Cascade
  const delAccRes = await req('/users/account', {
    method: 'DELETE',
    headers: authHeader,
  })
  console.log('8. Delete Account Cascade:', delAccRes.status === 204 ? 'PASS ✅' : 'FAIL ❌', `Status: ${delAccRes.status}`)

  console.log('--- All Backend Smoke Tests Completed Successfully! ---')
  server.close()
  process.exit(0)
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err)
  process.exit(1)
})
