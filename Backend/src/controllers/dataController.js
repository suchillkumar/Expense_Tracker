import { AppError, asyncHandler } from '../utils/errors.js'
import {
  transactionSchema, budgetSchema, groupSchema,
  groupExpenseSchema, settingsSchema, importSchema,
  goalSchema, recurringSchema
} from '../utils/validators.js'
import { User } from '../models/User.js'
import { Settings } from '../models/Settings.js'
import { Transaction } from '../models/Transaction.js'
import { Budget } from '../models/Budget.js'
import { Goal } from '../models/Goal.js'
import { Group } from '../models/Group.js'
import { GroupExpense } from '../models/GroupExpense.js'
import { Notification } from '../models/Notification.js'
import { AuditLog } from '../models/AuditLog.js'
import { RecurringTemplate } from '../models/RecurringTemplate.js'
import { Session } from '../models/Session.js'
import * as n8nService from '../services/n8n.service.js'

function uuid() { return crypto.randomUUID() }

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const camel = k === '_id' ? 'id' : k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v
  }
  return out
}

/* ================= SETTINGS ================= */

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ user_id: req.user.id }).lean()
  if (!settings) {
    const user = await User.findById(req.user.id).select('name email')
    settings = {
      _id: req.user.id, user_id: req.user.id, base_currency: 'INR',
      user_name: user?.name || '', email: user?.email || '',
      voice_alerts: 1, voice_alert_anomalies: 1, meal_voice_alerts: 0, email_notifications: 0,
      breakfast_enabled: 0, breakfast_time: '07:30', breakfast_message: 'Time for breakfast. Have a healthy meal.',
      lunch_enabled: 0, lunch_time: '12:30', lunch_message: 'Time for lunch. Take a break and eat well.',
      dinner_enabled: 0, dinner_time: '19:30', dinner_message: 'Time for dinner. Enjoy your meal.',
    }
    await Settings.create(settings)
    return res.json(snakeToCamel(settings))
  }
  res.json(snakeToCamel(settings))
})

export const updateSettings = asyncHandler(async (req, res) => {
  const updates = settingsSchema.parse(req.body)
  const setFields = {}
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) setFields[key] = value
  }
  await Settings.findOneAndUpdate(
    { user_id: req.user.id },
    { $set: setFields },
    { upsert: true, new: true }
  ).lean()
  const updated = await Settings.findOne({ user_id: req.user.id }).lean()
  res.json(snakeToCamel(updated))
})

/* ================= TRANSACTIONS ================= */

export const getTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 50
  const skip = (page - 1) * limit

  const filter = { user_id: req.user.id, is_deleted: false }
  if (req.query.category && req.query.category !== 'All') filter.category = req.query.category
  if (req.query.type && req.query.type !== 'all') filter.type = req.query.type
  if (req.query.search) filter.description = { $regex: req.query.search, $options: 'i' }
  if (req.query.payment_method) filter.payment_method = req.query.payment_method
  if (req.query.start_date || req.query.end_date) {
    filter.date = {}
    if (req.query.start_date) filter.date.$gte = new Date(req.query.start_date)
    if (req.query.end_date) filter.date.$lte = new Date(req.query.end_date)
  }

  // Sorting
  let sortOption = { date: -1 }
  if (req.query.sort === 'oldest') sortOption = { date: 1 }
  else if (req.query.sort === 'highest') sortOption = { amount: -1 }
  else if (req.query.sort === 'lowest') sortOption = { amount: 1 }

  const total = await Transaction.countDocuments(filter)
  const data = await Transaction.find(filter).sort(sortOption).skip(skip).limit(limit).lean()

  res.json({ data: data.map(snakeToCamel), total, page, limit })
})

export const getTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user_id: req.user.id, is_deleted: false }).lean()
  if (!tx) throw new AppError('Transaction not found', 404, 'NOT_FOUND')
  res.json(snakeToCamel(tx))
})

export const createTransaction = asyncHandler(async (req, res) => {
  const data = transactionSchema.parse(req.body)

  const id = uuid()
  const date = data.date ? new Date(data.date) : new Date()
  const splits = data.splits || []
  const tags = data.tags || []

  const tx = await Transaction.create({
    _id: id, user_id: req.user.id,
    description: data.description, amount: data.amount, type: data.type,
    category: data.category, currency: data.currency, exchange_rate: data.exchange_rate || 1,
    date, recurrence: data.recurrence || 'none', recurrence_end_date: data.recurrence_end_date || null,
    group_id: data.group_id || null, notes: data.notes || null, tags,
    split_type: data.split_type || 'none', splits, receipt_url: data.receipt_url || null,
    payment_method: data.payment_method || 'Other',
  })

  const txObj = tx.toObject()
  res.status(201).json(snakeToCamel(txObj))

  // Trigger n8n transaction workflow asynchronously without blocking response
  n8nService.triggerTransactionWorkflow(txObj, req.user).catch(err => {
    console.error(`[n8n-async] Transaction workflow failed: ${err.message}`)
  })
})

export const updateTransaction = asyncHandler(async (req, res) => {
  const data = transactionSchema.partial().parse(req.body)
  const tx = await Transaction.findOne({ _id: req.params.id, user_id: req.user.id, is_deleted: false })
  if (!tx) throw new AppError('Transaction not found', 404, 'NOT_FOUND')

  const setFields = {}
  if (data.description) setFields.description = data.description
  if (data.amount !== undefined) setFields.amount = data.amount
  if (data.type) setFields.type = data.type
  if (data.category) setFields.category = data.category
  if (data.currency) setFields.currency = data.currency
  if (data.exchange_rate) setFields.exchange_rate = data.exchange_rate
  if (data.date) setFields.date = new Date(data.date)
  if (data.recurrence) setFields.recurrence = data.recurrence
  if (data.recurrence_end_date !== undefined) setFields.recurrence_end_date = data.recurrence_end_date
  if (data.group_id !== undefined) setFields.group_id = data.group_id
  if (data.notes !== undefined) setFields.notes = data.notes
  if (data.tags) setFields.tags = data.tags
  if (data.split_type) setFields.split_type = data.split_type
  if (data.splits) setFields.splits = data.splits
  if (data.receipt_url !== undefined) setFields.receipt_url = data.receipt_url
  if (data.payment_method !== undefined) setFields.payment_method = data.payment_method

  const updated = await Transaction.findByIdAndUpdate(req.params.id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const deleteTransaction = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, user_id: req.user.id, is_deleted: false })
  if (!tx) throw new AppError('Transaction not found', 404, 'NOT_FOUND')

  await Transaction.findByIdAndUpdate(req.params.id, { $set: { is_deleted: true, deleted_at: new Date() } })
  res.status(204).send()
})

export const importTransactions = asyncHandler(async (req, res) => {
  const { rows, deduplicate } = importSchema.parse(req.body)
  let imported = 0
  const errors = []

  for (const row of rows) {
    try {
      if (deduplicate) {
        const dup = await Transaction.findOne({
          user_id: req.user.id, description: row.description, amount: row.amount,
          date: new Date(row.date || Date.now()), is_deleted: false,
        })
        if (dup) continue
      }

      await Transaction.create({
        _id: uuid(), user_id: req.user.id,
        description: row.description, amount: row.amount, type: row.type,
        category: row.category, currency: row.currency || 'INR', exchange_rate: row.exchange_rate || 1,
        date: row.date ? new Date(row.date) : new Date(), recurrence: row.recurrence || 'none',
        notes: row.notes || null, tags: row.tags || [], split_type: row.split_type || 'none',
        splits: row.splits || [], payment_method: row.payment_method || 'Other',
      })
      imported++
    } catch (err) {
      errors.push(`${row.description}: ${err.message}`)
    }
  }

  res.json({ count: imported, errors })
})

/* ================= BUDGETS ================= */

export const getBudgets = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ user_id: req.user.id }).sort({ month: -1 }).lean()

  const enriched = await Promise.all(budgets.map(async (b) => {
    const monthStartDate = new Date(b.month + '-01')
    const nextMonth = new Date(monthStartDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const result = await Transaction.aggregate([
      { $match: { user_id: req.user.id, type: 'expense', category: b.category, date: { $gte: monthStartDate, $lt: nextMonth }, is_deleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ])
    return { ...b, spent_amount: result[0]?.total || 0 }
  }))

  res.json(enriched.map(snakeToCamel))
})

export const createBudget = asyncHandler(async (req, res) => {
  const data = budgetSchema.parse(req.body)
  const month = data.month
  const id = uuid()

  const monthStartDate = new Date(month + '-01')
  const nextMonth = new Date(monthStartDate)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  const spentResult = await Transaction.aggregate([
    { $match: { user_id: req.user.id, type: 'expense', category: data.category, date: { $gte: monthStartDate, $lt: nextMonth }, is_deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const spentAmount = spentResult[0]?.total || 0

  await Budget.findOneAndUpdate(
    { user_id: req.user.id, category: data.category, month: month, period: data.period },
    { $set: { _id: id, limit_amount: data.limit_amount, alert_threshold: data.alert_threshold, spent_amount: spentAmount } },
    { upsert: true, new: true }
  )
  const budget = await Budget.findOne({ user_id: req.user.id, category: data.category, month: month }).lean()

  const resultData = snakeToCamel({ ...budget, spent_amount: spentAmount })
  res.status(201).json(resultData)

  if (spentAmount > 0) {
    n8nService.triggerBudgetWorkflow({
      budgetId: id,
      category: data.category,
      currentSpent: spentAmount,
      limit: data.limit_amount,
      month,
      pct: Math.round((spentAmount / data.limit_amount) * 100),
    }, req.user).catch(err => {
      console.error(`[n8n-async] Budget threshold workflow error: ${err.message}`)
    })
  }
})

export const updateBudget = asyncHandler(async (req, res) => {
  const data = budgetSchema.partial().parse(req.body)
  const budget = await Budget.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!budget) throw new AppError('Budget not found', 404, 'NOT_FOUND')

  const updated = await Budget.findByIdAndUpdate(req.params.id, { $set: data }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!budget) throw new AppError('Budget not found', 404, 'NOT_FOUND')
  await Budget.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

/* ================= FINANCIAL GOALS (Section 15) ================= */

export const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ user_id: req.user.id }).sort({ target_date: 1 }).lean()
  res.json(goals.map(snakeToCamel))
})

export const createGoal = asyncHandler(async (req, res) => {
  const data = goalSchema.parse(req.body)
  const id = uuid()
  const goal = await Goal.create({
    _id: id,
    user_id: req.user.id,
    name: data.name,
    category: data.category || 'General',
    target_amount: data.target_amount,
    current_amount: data.current_amount || 0,
    target_date: new Date(data.target_date),
    color: data.color || '#0ea5e9',
    notes: data.notes || null,
    status: data.status || 'in_progress',
  })
  res.status(201).json(snakeToCamel(goal.toObject()))
})

export const getGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id }).lean()
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND')
  res.json(snakeToCamel(goal))
})

export const updateGoal = asyncHandler(async (req, res) => {
  const data = goalSchema.partial().parse(req.body)
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND')

  const setFields = { ...data }
  if (data.target_date) setFields.target_date = new Date(data.target_date)

  const updated = await Goal.findByIdAndUpdate(req.params.id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const contributeGoal = asyncHandler(async (req, res) => {
  const { amount } = req.body
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    throw new AppError('A positive contribution amount is required', 400, 'BAD_REQUEST')
  }

  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND')

  const newAmount = goal.current_amount + amount
  const newStatus = newAmount >= goal.target_amount ? 'completed' : goal.status

  const updated = await Goal.findByIdAndUpdate(
    req.params.id,
    { $set: { current_amount: newAmount, status: newStatus } },
    { returnDocument: 'after' }
  ).lean()

  // Generate a notification on reaching milestones or completion
  if (newAmount >= goal.target_amount) {
    await Notification.create({
      _id: uuid(),
      user_id: req.user.id,
      title: '🎉 Goal Achieved!',
      message: `Congratulations! You reached your goal "${goal.name}" of ${goal.target_amount.toLocaleString()}.`,
      type: 'info',
      category: 'goal',
    })
  }

  res.json(snakeToCamel(updated))
})

export const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!goal) throw new AppError('Goal not found', 404, 'NOT_FOUND')
  await Goal.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

/* ================= RECURRING TRANSACTIONS (Section 16) ================= */

export const getRecurring = asyncHandler(async (req, res) => {
  const templates = await RecurringTemplate.find({ user_id: req.user.id, is_active: true })
    .sort({ next_run_date: 1 })
    .lean()
  res.json(templates.map(snakeToCamel))
})

export const createRecurring = asyncHandler(async (req, res) => {
  const data = recurringSchema.parse(req.body)
  const id = uuid()
  const startDate = new Date(data.start_date)
  const nextRunDate = data.next_run_date ? new Date(data.next_run_date) : startDate

  const template = await RecurringTemplate.create({
    _id: id,
    user_id: req.user.id,
    description: data.description,
    amount: data.amount,
    type: data.type,
    category: data.category,
    recurrence: data.recurrence,
    start_date: startDate,
    end_date: data.end_date ? new Date(data.end_date) : null,
    next_run_date: nextRunDate,
    is_active: true,
  })
  res.status(201).json(snakeToCamel(template.toObject()))
})

export const updateRecurring = asyncHandler(async (req, res) => {
  const data = recurringSchema.partial().parse(req.body)
  const item = await RecurringTemplate.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!item) throw new AppError('Recurring transaction rule not found', 404, 'NOT_FOUND')

  const setFields = { ...data }
  if (data.start_date) setFields.start_date = new Date(data.start_date)
  if (data.end_date !== undefined) setFields.end_date = data.end_date ? new Date(data.end_date) : null
  if (data.next_run_date) setFields.next_run_date = new Date(data.next_run_date)

  const updated = await RecurringTemplate.findByIdAndUpdate(req.params.id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const executeRecurring = asyncHandler(async (req, res) => {
  const now = new Date()
  const filter = { user_id: req.user.id, is_active: true }
  if (req.params.id && req.params.id !== 'run-all') {
    filter._id = req.params.id
  } else {
    filter.next_run_date = { $lte: now }
  }

  const dueRules = await RecurringTemplate.find(filter).lean()
  const generatedTxs = []

  for (const rule of dueRules) {
    const txId = uuid()
    const tx = await Transaction.create({
      _id: txId,
      user_id: req.user.id,
      description: rule.description,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      currency: 'INR',
      exchange_rate: 1,
      date: new Date(),
      recurrence: rule.recurrence,
      notes: `Auto-generated from recurring rule: ${rule.description}`,
      payment_method: 'AutoPay',
    })
    generatedTxs.push(tx.toObject())

    // Advance next_run_date
    const next = new Date(rule.next_run_date || now)
    if (rule.recurrence === 'daily') next.setDate(next.getDate() + 1)
    else if (rule.recurrence === 'weekly') next.setDate(next.getDate() + 7)
    else if (rule.recurrence === 'monthly') next.setMonth(next.getMonth() + 1)
    else if (rule.recurrence === 'yearly') next.setFullYear(next.getFullYear() + 1)

    const isPastEnd = rule.end_date && next > new Date(rule.end_date)
    await RecurringTemplate.findByIdAndUpdate(rule._id, {
      $set: {
        next_run_date: next,
        is_active: !isPastEnd,
      }
    })
  }

  res.json({
    processedCount: generatedTxs.length,
    transactions: generatedTxs.map(snakeToCamel),
  })
})

export const deleteRecurring = asyncHandler(async (req, res) => {
  const item = await RecurringTemplate.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!item) throw new AppError('Recurring transaction not found', 404, 'NOT_FOUND')
  await RecurringTemplate.findByIdAndUpdate(req.params.id, { $set: { is_active: false } })
  res.status(204).send()
})

/* ================= GROUP EXPENSES ================= */

export const getGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean()
  res.json(groups.map(snakeToCamel))
})

export const createGroup = asyncHandler(async (req, res) => {
  const data = groupSchema.parse(req.body)
  const id = uuid()
  const group = await Group.create({
    _id: id, user_id: req.user.id, name: data.name,
    description: data.description || '', members: data.members,
  })
  res.status(201).json(snakeToCamel(group.toObject()))
})

export const getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, user_id: req.user.id }).lean()
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND')
  res.json(snakeToCamel(group))
})

export const updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND')

  const setFields = {}
  if (req.body.name) setFields.name = req.body.name
  if (req.body.description !== undefined) setFields.description = req.body.description
  if (req.body.members) setFields.members = req.body.members

  const updated = await Group.findByIdAndUpdate(req.params.id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND')
  await Group.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

export const getGroupExpenses = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user.id }
  if (req.query.group_id) filter.group_id = req.query.group_id
  const expenses = await GroupExpense.find(filter).sort({ date: -1 }).lean()

  const groupIds = [...new Set(expenses.map(e => e.group_id))]
  const groups = await Group.find({ _id: { $in: groupIds } }).select('name').lean()
  const groupMap = Object.fromEntries(groups.map(g => [g._id, g.name]))

  const data = expenses.map(e => ({ ...e, group_name: groupMap[e.group_id] || null }))
  res.json(data.map(snakeToCamel))
})

export const createGroupExpense = asyncHandler(async (req, res) => {
  const data = groupExpenseSchema.parse(req.body)
  const group = await Group.findOne({ _id: data.group_id, user_id: req.user.id })
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND')

  const id = uuid()
  const expense = await GroupExpense.create({
    _id: id, user_id: req.user.id, group_id: data.group_id,
    description: data.description, amount: data.amount, currency: data.currency,
    paid_by: data.paid_by, splits: data.splits,
    date: data.date ? new Date(data.date) : new Date(),
  })
  res.status(201).json(snakeToCamel(expense.toObject()))
})

export const deleteGroupExpense = asyncHandler(async (req, res) => {
  const expense = await GroupExpense.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!expense) throw new AppError('Group expense not found', 404, 'NOT_FOUND')
  await GroupExpense.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

/* ================= NOTIFICATIONS ================= */

export const getNotifications = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user.id }
  if (req.query.unread_only === 'true') filter.read = false
  const notifications = await Notification.find(filter).sort({ created_at: -1 }).limit(100).lean()
  res.json(notifications.map(snakeToCamel))
})

export const createNotification = asyncHandler(async (req, res) => {
  const { message, type = 'info', category = 'general', data, title } = req.body
  const id = uuid()
  const notification = await Notification.create({
    _id: id, user_id: req.user.id, title: title || 'Notification', message, type, category,
    data: data || {},
  })
  res.status(201).json(snakeToCamel(notification.toObject()))
})

export const markNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user_id: req.user.id, read: false },
    { $set: { read: true, read_at: new Date() } }
  )
  res.status(204).send()
})

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user_id: req.user.id })
  if (!notification) throw new AppError('Notification not found', 404, 'NOT_FOUND')
  await Notification.findByIdAndDelete(req.params.id)
  res.status(204).send()
})

/* ================= ANALYTICS & REPORTS (Section 21 & 22) ================= */

export const getAnalytics = asyncHandler(async (req, res) => {
  const range = req.query.range || 'month'
  let dateFilter = new Date()
  if (range === 'today') {
    dateFilter.setHours(0, 0, 0, 0)
  } else if (range === 'week') {
    dateFilter.setDate(dateFilter.getDate() - 7)
  } else if (range === 'month') {
    dateFilter.setMonth(dateFilter.getMonth() - 1)
  } else if (range === '3months') {
    dateFilter.setMonth(dateFilter.getMonth() - 3)
  } else if (range === 'year') {
    dateFilter.setFullYear(dateFilter.getFullYear() - 1)
  } else if (range === 'all') {
    dateFilter = new Date('2000-01-01')
  }

  const matchStage = { user_id: req.user.id, is_deleted: false, date: { $gte: dateFilter } }

  const incomeResult = await Transaction.aggregate([
    { $match: { ...matchStage, type: 'income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const expenseResult = await Transaction.aggregate([
    { $match: { ...matchStage, type: 'expense' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const categories = await Transaction.aggregate([
    { $match: { ...matchStage, type: 'expense' } },
    { $group: { _id: '$category', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, category: '$_id', total: 1 } },
  ])
  const daily = await Transaction.aggregate([
    { $match: matchStage },
    { $group: { _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { '_id.day': 1 } },
    { $project: { _id: 0, day: '$_id.day', type: '$_id.type', total: 1 } },
  ])
  const paymentMethods = await Transaction.aggregate([
    { $match: matchStage },
    { $group: { _id: '$payment_method', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, method: { $ifNull: ['$_id', 'Other'] }, total: 1, count: 1 } }
  ])

  res.json({
    income: incomeResult[0]?.total || 0,
    expenses: expenseResult[0]?.total || 0,
    categories,
    daily,
    paymentMethods,
  })
})

export const getForecast = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 6
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const historical = await Transaction.aggregate([
    { $match: { user_id: req.user.id, is_deleted: false, date: { $gte: twelveMonthsAgo } } },
    { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' }, total: { $sum: '$amount' } } },
    { $sort: { '_id.month': 1 } },
  ])

  const monthlyData = {}
  historical.forEach((row) => {
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

  res.json({ forecast, historical: monthlyData })
})

export const getSettlementPlan = asyncHandler(async (req, res) => {
  const groupId = req.query.group_id
  if (!groupId) throw new AppError('group_id is required', 400, 'MISSING_GROUP_ID')

  const group = await Group.findOne({ _id: groupId, user_id: req.user.id }).lean()
  if (!group) throw new AppError('Group not found', 404, 'NOT_FOUND')

  const expenses = await GroupExpense.find({ group_id: groupId, user_id: req.user.id }).lean()
  const balances = {}
  const members = Array.isArray(group.members) ? group.members : JSON.parse(group.members || '[]')
  members.forEach((m) => { balances[m.user_id] = 0 })

  expenses.forEach((row) => {
    const splits = Array.isArray(row.splits) ? row.splits : JSON.parse(row.splits || '[]')
    splits.forEach((split) => {
      if (!balances[split.user_id]) balances[split.user_id] = 0
      if (split.paid) balances[split.user_id] -= parseFloat(split.amount || 0)
      else balances[split.user_id] += parseFloat(split.amount || 0)
    })
  })

  const debtors = []
  const creditors = []
  Object.entries(balances).forEach(([userId, amount]) => {
    if (amount > 0.01) debtors.push({ user_id: userId, amount })
    else if (amount < -0.01) creditors.push({ user_id: userId, amount: Math.abs(amount) })
  })

  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const plan = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    plan.push({ from: debtors[i].user_id, to: creditors[j].user_id, amount: Math.round(amount * 100) / 100 })
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount < 0.01) i++
    if (creditors[j].amount < 0.01) j++
  }

  res.json({ plan, balances })
})

export const exportCSV = asyncHandler(async (req, res) => {
  const txs = await Transaction.find({ user_id: req.user.id, is_deleted: false })
    .sort({ date: -1 })
    .select('_id date description amount type category tags notes payment_method')
    .lean()

  const headers = ['ID', 'Date', 'Description', 'Amount', 'Type', 'Category', 'Payment Method', 'Tags', 'Notes']
  const rows = txs.map((r) => [
    r._id, new Date(r.date).toISOString().slice(0, 10), `"${r.description.replace(/"/g, '""')}"`, r.amount, r.type, r.category,
    r.payment_method || 'Other', `"${(r.tags || []).join(';')}"`, `"${(r.notes || '').replace(/"/g, '""')}"`,
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=expenses_report.csv')
  res.send(csv)
})

export const getAuditLog = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user.id }
  if (req.query.entity_type) filter.entity_type = req.query.entity_type
  if (req.query.entity_id) filter.entity_id = req.query.entity_id
  const limitVal = parseInt(req.query.limit) || 50
  const logs = await AuditLog.find(filter).sort({ created_at: -1 }).limit(limitVal).lean()
  res.json(logs)
})

export const getExpenseSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const totalExpensesResult = await Transaction.aggregate([
    { $match: { user_id: userId, type: 'expense', is_deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const totalIncomeResult = await Transaction.aggregate([
    { $match: { user_id: userId, type: 'income', is_deleted: false } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  const categoryTotals = await Transaction.aggregate([
    { $match: { user_id: userId, type: 'expense', is_deleted: false } },
    { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $project: { _id: 0, category: '$_id', total: 1, count: 1 } },
  ])
  const recentTransactions = await Transaction.find({ user_id: userId, is_deleted: false })
    .sort({ date: -1 }).limit(5).lean()

  const totalExpenses = totalExpensesResult[0]?.total || 0
  const totalIncome = totalIncomeResult[0]?.total || 0

  res.json({
    totalExpenses,
    totalIncome,
    netSavings: totalIncome - totalExpenses,
    categoryTotals,
    recentTransactions,
  })
})

/**
 * Monthly Financial Report Generator (Section 22)
 */
export const getMonthlyReport = asyncHandler(async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7)
  const monthStart = new Date(month + '-01')
  const nextMonth = new Date(monthStart)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const match = { user_id: req.user.id, is_deleted: false, date: { $gte: monthStart, $lt: nextMonth } }

  const [txs, budgets, goals, user] = await Promise.all([
    Transaction.find(match).sort({ amount: -1 }).lean(),
    Budget.find({ user_id: req.user.id, month }).lean(),
    Goal.find({ user_id: req.user.id }).lean(),
    User.findById(req.user.id).lean(),
  ])

  const incomeTxs = txs.filter(t => t.type === 'income')
  const expenseTxs = txs.filter(t => t.type === 'expense')

  const totalIncome = incomeTxs.reduce((s, t) => s + t.amount, 0)
  const totalExpense = expenseTxs.reduce((s, t) => s + t.amount, 0)
  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

  // Top categories
  const catMap = {}
  expenseTxs.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount })
  const topCategories = Object.entries(catMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount)

  // Highest transaction
  const highestTransaction = expenseTxs[0] ? snakeToCamel(expenseTxs[0]) : null

  // Budget performance
  const budgetPerformance = budgets.map(b => {
    const spent = catMap[b.category] || 0
    const remaining = b.limit_amount - spent
    const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
    return {
      category: b.category,
      allocated: b.limit_amount,
      spent,
      remaining,
      utilizationPct: pct,
      status: pct > 100 ? 'exceeded' : (pct >= 80 ? 'warning' : 'on_track')
    }
  })

  // Goal progress
  const goalProgress = goals.map(g => ({
    name: g.name,
    target: g.target_amount,
    current: g.current_amount,
    progressPct: Math.round((g.current_amount / g.target_amount) * 100),
    status: g.status
  }))

  res.json({
    month,
    currency: user?.preferred_currency || 'INR',
    summary: {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      transactionCount: txs.length,
      incomeCount: incomeTxs.length,
      expenseCount: expenseTxs.length,
    },
    highestTransaction,
    topCategories,
    budgetPerformance,
    goalProgress,
    generatedAt: new Date().toISOString(),
  })
})

/* ================= ACCOUNT DELETION ================= */

export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id

  await Promise.all([
    User.findByIdAndDelete(userId),
    Settings.deleteMany({ user_id: userId }),
    Transaction.deleteMany({ user_id: userId }),
    Budget.deleteMany({ user_id: userId }),
    Goal.deleteMany({ user_id: userId }),
    RecurringTemplate.deleteMany({ user_id: userId }),
    Group.deleteMany({ user_id: userId }),
    GroupExpense.deleteMany({ user_id: userId }),
    Notification.deleteMany({ user_id: userId }),
    AuditLog.deleteMany({ user_id: userId }),
    Session.deleteMany({ user_id: userId }),
  ])

  res.status(204).send()
})
