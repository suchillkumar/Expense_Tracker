import { AppError, asyncHandler } from '../utils/errors.js'
import { AutomationLog } from '../models/AutomationLog.js'
import { AutomationSetting } from '../models/AutomationSetting.js'
import { BudgetRecommendation } from '../models/BudgetRecommendation.js'
import { Bill } from '../models/Bill.js'
import { Debt } from '../models/Debt.js'
import { Budget } from '../models/Budget.js'
import { Transaction } from '../models/Transaction.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { config } from '../config/index.js'
import * as n8nService from '../services/n8n.service.js'

function uuid() {
  return crypto.randomUUID()
}

function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(snakeToCamel)
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const camel = k === '_id' ? 'id' : k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v && typeof v === 'object' && !(v instanceof Date) ? snakeToCamel(v) : v
  }
  return out
}

/**
 * Get unified automation overview (metrics, active workflows, pending actions, recent activity)
 */
export const getAutomationOverview = asyncHandler(async (req, res) => {
  const userId = req.user.id

  // 1. Get or create user settings
  let settings = await AutomationSetting.findOne({ user_id: userId }).lean()
  if (!settings) {
    settings = await AutomationSetting.create({
      _id: uuid(),
      user_id: userId,
    })
    settings = settings.toObject()
  }

  // 2. Aggregate log statistics
  const statsAgg = await AutomationLog.aggregate([
    { $match: { user_id: userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const stats = {
    total: 0,
    successful: 0,
    pending: 0,
    failed: 0,
    fallback: 0,
  }

  statsAgg.forEach(item => {
    stats.total += item.count
    if (item._id === 'completed') stats.successful += item.count
    else if (item._id === 'fallback') stats.fallback += item.count
    else if (item._id === 'pending' || item._id === 'running') stats.pending += item.count
    else if (item._id === 'failed') stats.failed += item.count
  })

  // 3. Get pending budget recommendations
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const pendingRebalances = await BudgetRecommendation.find({
    user_id: userId,
    month: currentMonth,
    status: 'pending',
  }).sort({ created_at: -1 }).lean()

  // 4. Get pending anomaly alerts (notifications requiring action)
  const pendingAnomalies = await Notification.find({
    user_id: userId,
    category: 'anomaly',
    'data.actionRequired': true,
    read: false,
  }).sort({ created_at: -1 }).limit(5).lean()

  // 5. Get recent 10 automation logs
  const recentLogs = await AutomationLog.find({ user_id: userId })
    .sort({ created_at: -1 })
    .limit(10)
    .lean()

  // 6. Bills and Debts counts
  const upcomingBillsCount = await Bill.countDocuments({ user_id: userId, is_paid: false })
  const activeDebtsCount = await Debt.countDocuments({ user_id: userId, status: { $in: ['active', 'overdue'] } })

  res.json({
    stats,
    settings: snakeToCamel(settings),
    n8nStatus: {
      enabled: config.n8n.enabled,
      baseUrl: config.n8n.baseUrl,
    },
    pendingRebalances: pendingRebalances.map(snakeToCamel),
    pendingAnomalies: pendingAnomalies.map(snakeToCamel),
    recentLogs: recentLogs.map(snakeToCamel),
    upcomingBillsCount,
    activeDebtsCount,
  })
})

/**
 * Get paginated & filtered automation logs
 */
export const getAutomationLogs = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const skip = (page - 1) * limit

  const filter = { user_id: userId }
  if (req.query.status) filter.status = req.query.status
  if (req.query.workflow_name) filter.workflow_name = req.query.workflow_name
  if (req.query.event_type) filter.event_type = req.query.event_type
  if (req.query.search) {
    filter.$or = [
      { action_summary: { $regex: req.query.search, $options: 'i' } },
      { workflow_name: { $regex: req.query.search, $options: 'i' } },
      { event_type: { $regex: req.query.search, $options: 'i' } },
    ]
  }

  const total = await AutomationLog.countDocuments(filter)
  const logs = await AutomationLog.find(filter)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  res.json({
    data: logs.map(snakeToCamel),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})

/**
 * Retry a specific automation log
 */
export const retryAutomationLog = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { id } = req.params

  const log = await AutomationLog.findOne({ _id: id, user_id: userId })
  if (!log) throw new AppError('Automation log not found', 404, 'NOT_FOUND')

  await AutomationLog.findByIdAndUpdate(id, {
    $inc: { retry_count: 1 },
    $set: { status: 'running', error_message: null },
  })

  const result = await n8nService.triggerWorkflow(log.event_type, log.payload, {
    userId,
    referenceId: log.reference_id,
    workflowName: log.workflow_name,
    bypassSetting: true,
  })

  const updated = await AutomationLog.findById(id).lean()
  res.json({ success: true, result, log: snakeToCamel(updated) })
})

/**
 * Update user automation settings
 */
export const updateAutomationSettings = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const updates = req.body

  const setFields = {}
  if (updates.workflows) {
    for (const [k, v] of Object.entries(updates.workflows)) {
      setFields[`workflows.${k}`] = Boolean(v)
    }
  }
  if (updates.channels) {
    for (const [k, v] of Object.entries(updates.channels)) {
      setFields[`channels.${k}`] = Boolean(v)
    }
  }
  if (updates.thresholds) {
    if (updates.thresholds.budgetAlertPct !== undefined) setFields['thresholds.budget_alert_pct'] = updates.thresholds.budgetAlertPct
    if (updates.thresholds.anomalyZScore !== undefined) setFields['thresholds.anomaly_z_score'] = updates.thresholds.anomalyZScore
    if (updates.thresholds.billReminderDays !== undefined) setFields['thresholds.bill_reminder_days'] = updates.thresholds.billReminderDays
    if (updates.thresholds.debtReminderDays !== undefined) setFields['thresholds.debt_reminder_days'] = updates.thresholds.debtReminderDays
  }
  if (updates.holdHighSeverityAnomalies !== undefined) setFields.hold_high_severity_anomalies = updates.holdHighSeverityAnomalies
  if (updates.cooldownMinutes !== undefined) setFields.cooldown_minutes = updates.cooldownMinutes
  if (updates.customWebhookUrl !== undefined) setFields.custom_webhook_url = updates.customWebhookUrl

  await AutomationSetting.findOneAndUpdate(
    { user_id: userId },
    { $set: setFields },
    { upsert: true, new: true }
  )

  const updated = await AutomationSetting.findOne({ user_id: userId }).lean()
  res.json(snakeToCamel(updated))
})

/**
 * Trigger manual test workflow execution
 */
export const triggerManualWorkflow = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { workflowKey, customPayload } = req.body

  let result = null
  switch (workflowKey) {
    case 'transaction_automation': {
      const payload = customPayload || {
        description: 'Starbucks Coffee Reserve',
        amount: 450,
        type: 'expense',
        category: 'Food',
        currency: 'INR',
        date: new Date().toISOString(),
      }
      result = await n8nService.triggerWorkflow('transaction.created', payload, {
        userId,
        workflowName: 'New Transaction Automation',
        bypassSetting: true,
      })
      break
    }
    case 'bill_reminders': {
      result = await n8nService.triggerBillReminderWorkflow(userId)
      break
    }
    case 'smart_rebalancing': {
      const month = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      result = await n8nService.triggerSmartRebalancingWorkflow(userId, month)
      break
    }
    case 'debt_reminders': {
      result = await n8nService.triggerDebtReminderWorkflow(userId)
      break
    }
    case 'anomaly_response': {
      const payload = customPayload || {
        description: 'Apple Store Flagship',
        amount: 85000,
        type: 'expense',
        severity: 'high',
        expected: 4500,
        zScore: 3.8,
      }
      result = await n8nService.triggerAnomalyWorkflow(payload, userId)
      break
    }
    case 'ai_insights': {
      result = await n8nService.triggerInsightWorkflow(userId)
      break
    }
    case 'budget_threshold_alerts': {
      const payload = customPayload || {
        category: 'Shopping',
        currentSpent: 9200,
        limit: 10000,
        month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        pct: 92,
      }
      result = await n8nService.triggerBudgetWorkflow(payload, { id: userId })
      break
    }
    default:
      throw new AppError(`Unknown workflow key: ${workflowKey}`, 400, 'BAD_REQUEST')
  }

  res.json({ success: true, workflowKey, result })
})

/**
 * Inbound secure webhook receiver for n8n workflow callbacks
 */
export const handleInboundWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-n8n-signature']
  const secretHeader = req.headers['x-webhook-secret']

  // Validate Secret or HMAC signature
  const isSecretValid = secretHeader === config.n8n.webhookSecret
  const isSigValid = signature && n8nService.verifyWebhookSignature(req.body, signature, config.n8n.webhookSecret)

  if (!isSecretValid && !isSigValid) {
    throw new AppError('Unauthorized webhook signature or secret', 401, 'UNAUTHORIZED')
  }

  const { action, userId, logId, data } = req.body
  if (!action) throw new AppError('Action is required in webhook payload', 400, 'BAD_REQUEST')

  let actionResult = {}

  switch (action) {
    case 'update_transaction_category': {
      if (data?.transactionId && data?.category) {
        await Transaction.findByIdAndUpdate(data.transactionId, {
          $set: { category: data.category }
        })
        actionResult = { updated: true, transactionId: data.transactionId, category: data.category }
      }
      break
    }

    case 'create_notification': {
      if (userId && data?.message) {
        const notif = await Notification.create({
          _id: uuid(),
          user_id: userId,
          message: data.message,
          type: data.type || 'info',
          category: data.category || 'automation',
          data: data.details || {},
        })
        actionResult = { created: true, notificationId: notif._id }
      }
      break
    }

    case 'create_budget_recommendation': {
      if (userId && data) {
        const rec = await BudgetRecommendation.create({
          _id: uuid(),
          user_id: userId,
          month: data.month,
          source_category: data.sourceCategory,
          target_category: data.targetCategory,
          reallocate_amount: data.reallocateAmount,
          reason: data.reason,
          ai_confidence: data.aiConfidence || 0.9,
          status: 'pending',
        })
        actionResult = { created: true, recommendationId: rec._id }
      }
      break
    }

    case 'log_workflow_complete': {
      if (logId) {
        await AutomationLog.findByIdAndUpdate(logId, {
          $set: {
            status: 'completed',
            response_data: data,
            action_summary: data?.summary || 'n8n workflow completed via callback',
            completed_at: new Date(),
          }
        })
        actionResult = { updated: true, logId }
      }
      break
    }

    default:
      actionResult = { received: true, note: `Custom action ${action} acknowledged` }
  }

  res.json({ status: 'success', action, result: actionResult, timestamp: new Date().toISOString() })
})

/**
 * Responding to Anomaly Alerts (Confirm, Mark Expected, Ignore, Review)
 */
export const respondToAnomaly = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { notificationId, transactionId, action } = req.body

  if (!action) throw new AppError('Action is required (confirm, mark_expected, ignore)', 400, 'BAD_REQUEST')

  // Update notification to read & mark action taken
  if (notificationId) {
    await Notification.findOneAndUpdate(
      { _id: notificationId, user_id: userId },
      { $set: { read: true, 'data.actionRequired': false, 'data.userAction': action, 'data.resolvedAt': new Date() } }
    )
  }

  // Update transaction if transactionId is provided
  if (transactionId) {
    const tx = await Transaction.findOne({ _id: transactionId, user_id: userId })
    if (tx) {
      const tags = tx.tags || []
      if (action === 'mark_expected' && !tags.includes('verified_expense')) {
        tags.push('verified_expense')
      } else if (action === 'confirm' && !tags.includes('confirmed')) {
        tags.push('confirmed')
      }
      await Transaction.findByIdAndUpdate(transactionId, { $set: { tags } })
    }
  }

  // Log automation audit
  await AutomationLog.create({
    _id: uuid(),
    user_id: userId,
    workflow_name: 'Anomaly Response',
    event_type: 'anomaly.user_response',
    reference_id: transactionId || notificationId,
    status: 'completed',
    payload: { notificationId, transactionId, action },
    action_summary: `User resolved anomaly alert with action: ${action}`,
    executed_by: 'manual_trigger',
    started_at: new Date(),
    completed_at: new Date(),
  })

  res.json({ success: true, action, message: `Anomaly alert marked as ${action}` })
})

/**
 * Apply Smart Budget Rebalance recommendation upon user approval
 */
export const applyBudgetRebalance = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { recommendationId } = req.params

  const rec = await BudgetRecommendation.findOne({ _id: recommendationId, user_id: userId, status: 'pending' })
  if (!rec) throw new AppError('Budget recommendation not found or already processed', 404, 'NOT_FOUND')

  const { month, source_category, target_category, reallocate_amount } = rec

  // 1. Adjust source category budget
  const sourceBudget = await Budget.findOne({ user_id: userId, category: source_category, month })
  if (sourceBudget) {
    const newLimit = Math.max(100, sourceBudget.limit_amount - reallocate_amount)
    await Budget.findByIdAndUpdate(sourceBudget._id, { $set: { limit_amount: newLimit } })
  }

  // 2. Adjust target category budget
  const targetBudget = await Budget.findOne({ user_id: userId, category: target_category, month })
  if (targetBudget) {
    const newLimit = targetBudget.limit_amount + reallocate_amount
    await Budget.findByIdAndUpdate(targetBudget._id, { $set: { limit_amount: newLimit } })
  } else {
    await Budget.create({
      _id: uuid(),
      user_id: userId,
      category: target_category,
      limit_amount: reallocate_amount,
      month,
      period: 'monthly',
    })
  }

  // 3. Mark recommendation as approved
  await BudgetRecommendation.findByIdAndUpdate(recommendationId, {
    $set: { status: 'approved', applied_at: new Date() }
  })

  // 4. Create confirmation notification
  await Notification.create({
    _id: uuid(),
    user_id: userId,
    message: `✅ Smart Budget Rebalancing Applied: Reallocated ₹${reallocate_amount.toLocaleString()} from ${source_category} to ${target_category} for ${month}.`,
    type: 'success',
    category: 'budget',
    data: { recommendationId, month, source_category, target_category, reallocate_amount },
  })

  // 5. Log automation execution
  await AutomationLog.create({
    _id: uuid(),
    user_id: userId,
    workflow_name: 'Smart Budget Rebalancing',
    event_type: 'budget.rebalance_applied',
    reference_id: recommendationId,
    status: 'completed',
    payload: { recommendationId, month, source_category, target_category, reallocate_amount },
    action_summary: `Applied ₹${reallocate_amount} transfer from ${source_category} to ${target_category}`,
    executed_by: 'manual_trigger',
    started_at: new Date(),
    completed_at: new Date(),
  })

  res.json({
    success: true,
    message: `Successfully reallocated ₹${reallocate_amount.toLocaleString()} from ${source_category} to ${target_category}`,
  })
})

/**
 * Dismiss/Reject a Budget Rebalance recommendation
 */
export const dismissBudgetRebalance = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const { recommendationId } = req.params

  const rec = await BudgetRecommendation.findOne({ _id: recommendationId, user_id: userId })
  if (!rec) throw new AppError('Budget recommendation not found', 404, 'NOT_FOUND')

  await BudgetRecommendation.findByIdAndUpdate(recommendationId, {
    $set: { status: 'rejected', dismissed_at: new Date() }
  })

  res.json({ success: true, message: 'Budget recommendation dismissed' })
})

/* ================= BILLS CONTROLLER ================= */

export const getBills = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user.id }
  if (req.query.is_paid !== undefined) filter.is_paid = req.query.is_paid === 'true'
  const bills = await Bill.find(filter).sort({ due_date: 1 }).lean()
  res.json(bills.map(snakeToCamel))
})

export const createBill = asyncHandler(async (req, res) => {
  const { title, amount, currency, category, due_date, recurrence, auto_pay, notes, payee_url } = req.body
  if (!title || !amount || !due_date) {
    throw new AppError('Title, amount, and due_date are required', 400, 'BAD_REQUEST')
  }

  const id = uuid()
  const bill = await Bill.create({
    _id: id,
    user_id: req.user.id,
    title,
    amount: parseFloat(amount),
    currency: currency || 'INR',
    category: category || 'Bills',
    due_date: new Date(due_date),
    recurrence: recurrence || 'monthly',
    auto_pay: Boolean(auto_pay),
    notes: notes || '',
    payee_url: payee_url || '',
  })

  res.status(201).json(snakeToCamel(bill.toObject()))
})

export const updateBill = asyncHandler(async (req, res) => {
  const { id } = req.params
  const bill = await Bill.findOne({ _id: id, user_id: req.user.id })
  if (!bill) throw new AppError('Bill not found', 404, 'NOT_FOUND')

  const setFields = {}
  if (req.body.title) setFields.title = req.body.title
  if (req.body.amount !== undefined) setFields.amount = parseFloat(req.body.amount)
  if (req.body.category) setFields.category = req.body.category
  if (req.body.due_date) setFields.due_date = new Date(req.body.due_date)
  if (req.body.recurrence) setFields.recurrence = req.body.recurrence
  if (req.body.auto_pay !== undefined) setFields.auto_pay = req.body.auto_pay
  if (req.body.is_paid !== undefined) {
    setFields.is_paid = req.body.is_paid
    setFields.paid_at = req.body.is_paid ? new Date() : null
  }
  if (req.body.notes !== undefined) setFields.notes = req.body.notes
  if (req.body.payee_url !== undefined) setFields.payee_url = req.body.payee_url

  const updated = await Bill.findByIdAndUpdate(id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const deleteBill = asyncHandler(async (req, res) => {
  const { id } = req.params
  const bill = await Bill.findOne({ _id: id, user_id: req.user.id })
  if (!bill) throw new AppError('Bill not found', 404, 'NOT_FOUND')

  await Bill.findByIdAndDelete(id)
  res.status(204).send()
})

/* ================= DEBTS CONTROLLER ================= */

export const getDebts = asyncHandler(async (req, res) => {
  const filter = { user_id: req.user.id }
  if (req.query.status) filter.status = req.query.status
  const debts = await Debt.find(filter).sort({ due_date: 1 }).lean()
  res.json(debts.map(snakeToCamel))
})

export const createDebt = asyncHandler(async (req, res) => {
  const { title, creditor, total_amount, remaining_balance, minimum_payment, interest_rate, due_date, currency, notes } = req.body
  if (!title || !total_amount || !due_date) {
    throw new AppError('Title, total_amount, and due_date are required', 400, 'BAD_REQUEST')
  }

  const id = uuid()
  const debt = await Debt.create({
    _id: id,
    user_id: req.user.id,
    title,
    creditor: creditor || '',
    total_amount: parseFloat(total_amount),
    remaining_balance: remaining_balance !== undefined ? parseFloat(remaining_balance) : parseFloat(total_amount),
    minimum_payment: parseFloat(minimum_payment || 0),
    interest_rate: parseFloat(interest_rate || 0),
    due_date: new Date(due_date),
    currency: currency || 'INR',
    notes: notes || '',
  })

  res.status(201).json(snakeToCamel(debt.toObject()))
})

export const updateDebt = asyncHandler(async (req, res) => {
  const { id } = req.params
  const debt = await Debt.findOne({ _id: id, user_id: req.user.id })
  if (!debt) throw new AppError('Debt not found', 404, 'NOT_FOUND')

  const setFields = {}
  if (req.body.title) setFields.title = req.body.title
  if (req.body.creditor !== undefined) setFields.creditor = req.body.creditor
  if (req.body.total_amount !== undefined) setFields.total_amount = parseFloat(req.body.total_amount)
  if (req.body.remaining_balance !== undefined) {
    setFields.remaining_balance = parseFloat(req.body.remaining_balance)
    if (setFields.remaining_balance <= 0) setFields.status = 'settled'
  }
  if (req.body.minimum_payment !== undefined) setFields.minimum_payment = parseFloat(req.body.minimum_payment)
  if (req.body.interest_rate !== undefined) setFields.interest_rate = parseFloat(req.body.interest_rate)
  if (req.body.due_date) setFields.due_date = new Date(req.body.due_date)
  if (req.body.status) setFields.status = req.body.status
  if (req.body.notes !== undefined) setFields.notes = req.body.notes

  const updated = await Debt.findByIdAndUpdate(id, { $set: setFields }, { new: true }).lean()
  res.json(snakeToCamel(updated))
})

export const recordDebtPayment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { paymentAmount } = req.body

  if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
    throw new AppError('Valid paymentAmount is required', 400, 'BAD_REQUEST')
  }

  const debt = await Debt.findOne({ _id: id, user_id: req.user.id })
  if (!debt) throw new AppError('Debt not found', 404, 'NOT_FOUND')

  const payAmt = parseFloat(paymentAmount)
  const newBalance = Math.max(0, debt.remaining_balance - payAmt)
  const newStatus = newBalance === 0 ? 'settled' : 'active'

  await Debt.findByIdAndUpdate(id, {
    $set: {
      remaining_balance: newBalance,
      status: newStatus,
      last_payment_date: new Date(),
    }
  })

  // Create a transaction record for this payment
  await Transaction.create({
    _id: uuid(),
    user_id: req.user.id,
    description: `Debt payment: ${debt.title}`,
    amount: payAmt,
    type: 'expense',
    category: 'Bills',
    currency: debt.currency || 'INR',
    date: new Date(),
    notes: `Automated debt payment tracking for ${debt.title}`,
  })

  // Log automation
  await AutomationLog.create({
    _id: uuid(),
    user_id: req.user.id,
    workflow_name: 'Debt Payment Reminder',
    event_type: 'debt.payment_recorded',
    reference_id: id,
    status: 'completed',
    payload: { debtId: id, paymentAmount: payAmt, remainingBalance: newBalance },
    action_summary: `Recorded ₹${payAmt.toLocaleString()} payment on "${debt.title}". Remaining: ₹${newBalance.toLocaleString()}`,
    executed_by: 'manual_trigger',
    started_at: new Date(),
    completed_at: new Date(),
  })

  const updated = await Debt.findById(id).lean()
  res.json({ success: true, debt: snakeToCamel(updated) })
})

export const deleteDebt = asyncHandler(async (req, res) => {
  const { id } = req.params
  const debt = await Debt.findOne({ _id: id, user_id: req.user.id })
  if (!debt) throw new AppError('Debt not found', 404, 'NOT_FOUND')

  await Debt.findByIdAndDelete(id)
  res.status(204).send()
})
