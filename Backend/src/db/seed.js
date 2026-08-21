import { connectMongo } from './index.js'
import bcrypt from 'bcrypt'
import { User } from '../models/User.js'
import { Settings } from '../models/Settings.js'
import { Transaction } from '../models/Transaction.js'
import { Budget } from '../models/Budget.js'
import { Group } from '../models/Group.js'
import { GroupExpense } from '../models/GroupExpense.js'
import { Notification } from '../models/Notification.js'

function uuid() { return crypto.randomUUID() }

const DEMO_PASSWORD = 'demo123'

async function run() {
  console.log('Connecting to MongoDB...')
  await connectMongo()

  const count = await User.countDocuments()
  if (count > 0) {
    console.log('Database already seeded, skipping.')
    process.exit(0)
  }

  console.log('Seeding demo data...')
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const userId = uuid()

  await User.create({ _id: userId, name: 'Demo User', email: 'demo@test.com', password_hash: passwordHash })
  await Settings.create({ _id: userId, user_id: userId, base_currency: 'INR', user_name: 'Demo User', email: 'demo@test.com' })

  const now = new Date()
  const transactions = [
    ['Groceries', 85, 'expense', 'Food', 0],
    ['Salary', 3000, 'income', 'Salary', 1],
    ['Uber ride', 42, 'expense', 'Transport', 1],
    ['Netflix', 15, 'expense', 'Bills', 2, 'monthly'],
    ['Big laptop purchase', 1800, 'expense', 'Shopping', 0],
    ['Freelance project', 1200, 'income', 'Investment', 5],
    ['Electric bill', 85, 'expense', 'Utilities', 3],
  ]

  for (const [desc, amount, type, category, daysAgo, recurrence] of transactions) {
    const date = new Date(now.getTime() - Number(daysAgo) * 86400000)
    await Transaction.create({
      _id: uuid(), user_id: userId,
      description: desc, amount, type, category, currency: 'INR',
      date, recurrence: recurrence || 'none',
    })
  }

  const month = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  await Budget.create({ _id: uuid(), user_id: userId, category: 'Food', limit_amount: 400, spent_amount: 85, period: 'monthly', month })
  await Budget.create({ _id: uuid(), user_id: userId, category: 'Bills', limit_amount: 200, spent_amount: 15, period: 'monthly', month })

  const groupId = uuid()
  await Group.create({
    _id: groupId, user_id: userId, name: 'Trip to Goa', description: 'Weekend trip',
    members: [
      { user_id: userId, name: 'Demo User', email: 'demo@test.com' },
      { user_id: uuid(), name: 'Alex', email: 'alex@test.com' },
      { user_id: uuid(), name: 'Sam', email: 'sam@test.com' },
    ],
  })

  const geId = uuid()
  await GroupExpense.create({
    _id: geId, user_id: userId, group_id: groupId, description: 'Hotel night',
    amount: 300, currency: 'INR', paid_by: userId,
    splits: [
      { user_id: userId, amount: 100, paid: true },
      { user_id: uuid(), amount: 100, paid: false },
      { user_id: uuid(), amount: 100, paid: false },
    ],
    date: now,
  })

  await Notification.create({ _id: uuid(), user_id: userId, message: 'Budget exceeded for Food', type: 'alert', category: 'budget' })

  console.log('Demo data seeded successfully!')
  console.log('Login with: demo@test.com / demo123')
  process.exit(0)
}

run().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
