import crypto from 'crypto'
import { config } from '../config/index.js'
import { AutomationLog } from '../models/AutomationLog.js'
import { AutomationSetting } from '../models/AutomationSetting.js'
import { Notification } from '../models/Notification.js'
import { Budget } from '../models/Budget.js'
import { BudgetRecommendation } from '../models/BudgetRecommendation.js'
import { Bill } from '../models/Bill.js'
import { Debt } from '../models/Debt.js'
import { Transaction } from '../models/Transaction.js'
import { Settings } from '../models/Settings.js'
import * as aiService from './ai.service.js'
import { sendEmail, buildNotificationEmail } from './email.service.js'

function uuid() {
  return crypto.randomUUID()
}

/**
 * Generate HMAC SHA-256 signature for webhook security
 */
export function generateWebhookSignature(payload, secret) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return crypto.createHmac('sha256', secret || config.n8n.webhookSecret).update(body).digest('hex')
}

/**
 * Verify HMAC signature on incoming webhooks from n8n
 */
export function verifyWebhookSignature(payload, signature, secret) {
  if (!signature) return false
  const expected = generateWebhookSignature(payload, secret)
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

/**
 * Core dispatcher to send events to n8n webhook endpoints
 */
export async function triggerWorkflow(eventType, payload, options = {}) {
  const { userId, referenceId = null, workflowName = eventType, bypassSetting = false } = options
  const startTime = Date.now()
  const logId = uuid()

  // 1. Check user automation settings
  if (userId && !bypassSetting) {
    try {
      const setting = await AutomationSetting.findOne({ user_id: userId }).lean()
      if (setting && setting.workflows) {
        const keyMap = {
          'transaction.created': 'transaction_automation',
          'transaction.updated': 'transaction_automation',
          'budget.threshold_crossed': 'budget_threshold_alerts',
          'bill.reminder_check': 'bill_reminders',
          'budget.rebalance_check': 'smart_rebalancing',
          'statement.import': 'statement_import',
          'debt.reminder_check': 'debt_reminders',
          'anomaly.detected': 'anomaly_response',
          'insight.generate': 'ai_insights',
          'notification.dispatch': 'notification_dispatcher',
        }
        const settingKey = keyMap[eventType]
        if (settingKey && setting.workflows[settingKey] === false) {
          return { skipped: true, reason: `Workflow ${settingKey} disabled by user` }
        }
      }
    } catch (err) {
      console.warn(`[n8n-service] Could not read user automation settings: ${err.message}`)
    }
  }

  // 2. Create initial Automation Log entry
  let logEntry = null
  try {
    logEntry = await AutomationLog.create({
      _id: logId,
      user_id: userId || 'system',
      workflow_name: workflowName,
      event_type: eventType,
      reference_id: referenceId,
      status: 'running',
      payload,
      started_at: new Date(),
      executed_by: 'n8n',
    })
  } catch (err) {
    console.error(`[n8n-service] Failed to create AutomationLog: ${err.message}`)
  }

  // Determine target n8n webhook URL
  const webhookPathMap = {
    'transaction.created': config.n8n.webhooks.transaction,
    'transaction.updated': config.n8n.webhooks.transaction,
    'budget.threshold_crossed': config.n8n.webhooks.budgetThreshold,
    'bill.reminder_check': config.n8n.webhooks.billReminder,
    'budget.rebalance_check': config.n8n.webhooks.budgetRebalance,
    'statement.import': config.n8n.webhooks.statementImport,
    'debt.reminder_check': config.n8n.webhooks.debtReminder,
    'anomaly.detected': config.n8n.webhooks.anomaly,
    'insight.generate': config.n8n.webhooks.insight,
    'notification.dispatch': config.n8n.webhooks.notification,
  }

  const endpointPath = webhookPathMap[eventType] || `/webhook/${eventType.replace('.', '-')}`
  const targetUrl = `${config.n8n.baseUrl.replace(/\/+$/, '')}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`

  const fullPayload = {
    event: eventType,
    logId,
    timestamp: new Date().toISOString(),
    userId,
    referenceId,
    data: payload,
  }

  const signature = generateWebhookSignature(fullPayload, config.n8n.webhookSecret)

  // 3. Attempt HTTP POST to n8n if enabled
  if (config.n8n.enabled) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.n8n.timeoutMs)

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Signature': signature,
          'X-Webhook-Secret': config.n8n.webhookSecret,
          ...(config.n8n.apiKey ? { 'Authorization': `Bearer ${config.n8n.apiKey}` } : {}),
        },
        body: JSON.stringify(fullPayload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const durationMs = Date.now() - startTime

      if (res.ok) {
        let responseData = {}
        try { responseData = await res.json() } catch { responseData = { status: 'acknowledged' } }

        if (logEntry) {
          await AutomationLog.findByIdAndUpdate(logId, {
            $set: {
              status: 'completed',
              response_data: responseData,
              duration_ms: durationMs,
              action_summary: responseData.summary || `Dispatched to n8n successfully (${res.status})`,
              completed_at: new Date(),
            }
          })
        }

        return { success: true, via: 'n8n', logId, responseData, durationMs }
      } else {
        throw new Error(`n8n webhook responded with HTTP ${res.status}: ${res.statusText}`)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const isAbort = err.name === 'AbortError'
      const errorMsg = isAbort ? `n8n webhook timed out after ${config.n8n.timeoutMs}ms` : err.message
      console.warn(`[n8n-service] n8n unavailable for ${eventType} (${errorMsg}). Executing local fallback...`)

      // Execute fallback
      const fallbackResult = await executeLocalFallback(eventType, payload, userId, referenceId)
      const durationMs = Date.now() - startTime

      if (logEntry) {
        await AutomationLog.findByIdAndUpdate(logId, {
          $set: {
            status: 'fallback',
            error_message: errorMsg,
            response_data: fallbackResult,
            duration_ms: durationMs,
            action_summary: `Local Fallback: ${fallbackResult.summary || 'Executed local AI/rules logic'}`,
            executed_by: 'backend_fallback',
            completed_at: new Date(),
          }
        })
      }

      return { success: true, via: 'backend_fallback', logId, responseData: fallbackResult, durationMs, error: errorMsg }
    }
  } else {
    // n8n is explicitly disabled, run local fallback directly
    const fallbackResult = await executeLocalFallback(eventType, payload, userId, referenceId)
    const durationMs = Date.now() - startTime

    if (logEntry) {
      await AutomationLog.findByIdAndUpdate(logId, {
        $set: {
          status: 'completed',
          response_data: fallbackResult,
          duration_ms: durationMs,
          action_summary: `Local Engine: ${fallbackResult.summary || 'Executed local logic'}`,
          executed_by: 'backend_fallback',
          completed_at: new Date(),
        }
      })
    }

    return { success: true, via: 'backend_fallback', logId, responseData: fallbackResult, durationMs }
  }
}

/**
 * Local Fallback Execution Engine when n8n is offline or unreachable
 */
async function executeLocalFallback(eventType, payload, userId, referenceId) {
  switch (eventType) {
    case 'transaction.created':
    case 'transaction.updated': {
      const { description, amount, type, category, date } = payload
      const updates = {}
      let isAnomaly = false
      let anomalyDetails = null
      let autoCategory = category

      // 1. Auto-categorize if Other or empty
      if (!category || category === 'Other' || category === 'Uncategorized') {
        autoCategory = aiService.categorizeTransaction(description || '')
        if (autoCategory && autoCategory !== category) {
          updates.category = autoCategory
        }
      }

      // 2. Anomaly detection check for expenses
      if (type === 'expense' && amount > 0 && userId) {
        try {
          const anomalies = await aiService.detectAnomalies(userId)
          const matched = anomalies.find(a => Math.abs(a.amount - amount) < 1)
          if (matched || (anomalies.length > 0 && amount > 5000)) {
            isAnomaly = true
            anomalyDetails = matched || {
              amount,
              expected: 1500,
              z_score: 2.8,
              severity: amount > 10000 ? 'high' : 'medium',
            }

            // Create notification for anomaly
            await Notification.create({
              _id: uuid(),
              user_id: userId,
              message: `⚠️ Unusual expense of ₹${amount.toLocaleString()} on "${description}" (${autoCategory}).`,
              type: 'warning',
              category: 'anomaly',
              data: {
                transactionId: referenceId,
                amount,
                severity: anomalyDetails.severity,
                expected: anomalyDetails.expected,
                zScore: anomalyDetails.z_score,
                actionRequired: true,
              },
            })
          }
        } catch (err) {
          console.warn(`[fallback] Anomaly detection error: ${err.message}`)
        }
      }

      // 3. Check Budget Thresholds
      if (type === 'expense' && userId) {
        const txDate = date ? new Date(date) : new Date()
        const monthStr = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`
        const budget = await Budget.findOne({ user_id: userId, category: autoCategory, month: monthStr }).lean()
        if (budget) {
          const monthStart = new Date(`${monthStr}-01`)
          const nextMonth = new Date(monthStart)
          nextMonth.setMonth(nextMonth.getMonth() + 1)

          const spentAgg = await Transaction.aggregate([
            { $match: { user_id: userId, type: 'expense', category: autoCategory, date: { $gte: monthStart, $lt: nextMonth }, is_deleted: false } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ])
          const currentSpent = (spentAgg[0]?.total || 0) + (payload.amount || 0)
          const pct = Math.round((currentSpent / budget.limit_amount) * 100)

          if (pct >= (budget.alert_threshold || 80)) {
            await Notification.create({
              _id: uuid(),
              user_id: userId,
              message: `🚨 Budget Alert: ${autoCategory} spending has reached ${pct}% of your limit (₹${currentSpent.toLocaleString()} / ₹${budget.limit_amount.toLocaleString()}).`,
              type: pct >= 100 ? 'alert' : 'warning',
              category: 'budget',
              data: { category: autoCategory, month: monthStr, currentSpent, limit: budget.limit_amount, pct },
            })
          }
        }
      }

      return {
        summary: isAnomaly
          ? `Categorized as ${autoCategory}, flagged as ${anomalyDetails?.severity || 'unusual'} anomaly`
          : `Categorized as ${autoCategory}, evaluated normal`,
        autoCategory,
        isAnomaly,
        anomalyDetails,
      }
    }

    case 'budget.threshold_crossed': {
      const { category, currentSpent, limit, month, pct } = payload
      if (userId) {
        await Notification.create({
          _id: uuid(),
          user_id: userId,
          message: `📊 Budget Alert: ${category} is at ${pct}% of limit (₹${currentSpent} of ₹${limit}) for ${month}.`,
          type: pct >= 100 ? 'alert' : 'warning',
          category: 'budget',
          data: payload,
        })
      }
      return { summary: `Budget alert recorded for ${category} at ${pct}%` }
    }

    case 'bill.reminder_check': {
      if (!userId) return { summary: 'No user ID provided for bill check' }
      const now = new Date()
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const upcomingBills = await Bill.find({
        user_id: userId,
        is_paid: false,
        due_date: { $lte: in7Days },
      }).lean()

      let remindedCount = 0
      for (const bill of upcomingBills) {
        const dueTime = new Date(bill.due_date).getTime()
        const diffDays = Math.ceil((dueTime - now.getTime()) / (24 * 60 * 60 * 1000))
        const dueText = diffDays <= 0 ? 'is due TODAY' : diffDays === 1 ? 'is due TOMORROW' : `is due in ${diffDays} days`

        // Check if reminded in the last 20 hours to prevent duplicate spam
        const lastReminded = bill.last_reminded_at ? new Date(bill.last_reminded_at).getTime() : 0
        if (now.getTime() - lastReminded > 20 * 60 * 60 * 1000) {
          await Notification.create({
            _id: uuid(),
            user_id: userId,
            message: `🔔 Bill Reminder: "${bill.title}" (₹${bill.amount.toLocaleString()}) ${dueText}.`,
            type: diffDays <= 1 ? 'alert' : 'info',
            category: 'bill',
            data: { billId: bill._id, amount: bill.amount, dueDate: bill.due_date, diffDays },
          })
          await Bill.findByIdAndUpdate(bill._id, { $set: { last_reminded_at: now } })
          remindedCount++
        }
      }

      return {
        summary: `Checked ${upcomingBills.length} upcoming bills, sent ${remindedCount} reminders`,
        remindedCount,
        totalUpcoming: upcomingBills.length,
      }
    }

    case 'debt.reminder_check': {
      if (!userId) return { summary: 'No user ID provided for debt check' }
      const now = new Date()
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const activeDebts = await Debt.find({
        user_id: userId,
        status: { $in: ['active', 'overdue'] },
        due_date: { $lte: in7Days },
      }).lean()

      let remindedCount = 0
      for (const debt of activeDebts) {
        const dueTime = new Date(debt.due_date).getTime()
        const diffDays = Math.ceil((dueTime - now.getTime()) / (24 * 60 * 60 * 1000))
        const isOverdue = diffDays < 0
        const alertMsg = isOverdue
          ? `⚠️ Overdue Debt: "${debt.title}" is ${Math.abs(diffDays)} days overdue! Minimum due: ₹${(debt.minimum_payment || debt.remaining_balance).toLocaleString()}.`
          : `💳 Debt Payment Due: "${debt.title}" due in ${diffDays} days. Minimum due: ₹${(debt.minimum_payment || debt.remaining_balance).toLocaleString()}.`

        const lastReminded = debt.last_reminded_at ? new Date(debt.last_reminded_at).getTime() : 0
        if (now.getTime() - lastReminded > 20 * 60 * 60 * 1000) {
          await Notification.create({
            _id: uuid(),
            user_id: userId,
            message: alertMsg,
            type: isOverdue ? 'alert' : 'warning',
            category: 'debt',
            data: { debtId: debt._id, remaining: debt.remaining_balance, dueDate: debt.due_date, diffDays },
          })
          await Debt.findByIdAndUpdate(debt._id, { $set: { last_reminded_at: now } })
          remindedCount++
        }
      }

      return {
        summary: `Checked ${activeDebts.length} active debts, sent ${remindedCount} reminders`,
        remindedCount,
        totalActive: activeDebts.length,
      }
    }

    case 'budget.rebalance_check': {
      if (!userId) return { summary: 'No user ID provided for budget rebalance' }
      const month = payload.month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`

      const budgets = await Budget.find({ user_id: userId, month }).lean()
      if (budgets.length < 2) {
        return { summary: 'Not enough budgets defined for rebalancing' }
      }

      const monthStart = new Date(`${month}-01`)
      const nextMonth = new Date(monthStart)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      const enriched = await Promise.all(budgets.map(async (b) => {
        const spentRes = await Transaction.aggregate([
          { $match: { user_id: userId, type: 'expense', category: b.category, date: { $gte: monthStart, $lt: nextMonth }, is_deleted: false } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ])
        const spent = spentRes[0]?.total || 0
        const utilization = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
        return { ...b, spent, utilization, remaining: Math.max(0, b.limit_amount - spent) }
      }))

      const overspending = enriched.filter(b => b.utilization >= 85).sort((a, b) => b.utilization - a.utilization)
      const underspending = enriched.filter(b => b.utilization <= 50 && b.remaining >= 500).sort((a, b) => b.remaining - a.remaining)

      if (overspending.length > 0 && underspending.length > 0) {
        const target = overspending[0]
        const source = underspending[0]
        const reallocateAmount = Math.min(Math.round(source.remaining * 0.5), Math.max(500, Math.round((target.spent - target.limit_amount * 0.8))))

        if (reallocateAmount >= 100) {
          // Check if pending recommendation exists
          const existingRec = await BudgetRecommendation.findOne({
            user_id: userId,
            month,
            target_category: target.category,
            source_category: source.category,
            status: 'pending',
          })

          if (!existingRec) {
            const rec = await BudgetRecommendation.create({
              _id: uuid(),
              user_id: userId,
              month,
              source_category: source.category,
              target_category: target.category,
              reallocate_amount: reallocateAmount,
              source_current_budget: source.limit_amount,
              source_spent: source.spent,
              target_current_budget: target.limit_amount,
              target_spent: target.spent,
              reason: `${target.category} spending is at ${target.utilization}% of limit. You have ₹${source.remaining.toLocaleString()} unused in ${source.category}. Reallocating ₹${reallocateAmount.toLocaleString()} prevents budget overrun.`,
              ai_confidence: 0.92,
              status: 'pending',
            })

            await Notification.create({
              _id: uuid(),
              user_id: userId,
              message: `💡 Smart Budget Suggestion: Reallocate ₹${reallocateAmount.toLocaleString()} from ${source.category} to ${target.category}.`,
              type: 'info',
              category: 'rebalance',
              data: { recommendationId: rec._id, reallocateAmount, source: source.category, target: target.category },
            })

            return {
              summary: `Generated rebalance proposal: ₹${reallocateAmount} from ${source.category} to ${target.category}`,
              recommendation: rec.toObject(),
            }
          }
        }
      }

      return { summary: 'Budget spending is balanced across categories. No rebalancing needed.' }
    }

    case 'statement.import': {
      const { rows = [], deduplicate = true } = payload
      let imported = 0
      let duplicates = 0
      let invalid = 0
      const errors = []

      for (const row of rows) {
        try {
          if (!row.amount || isNaN(row.amount) || !row.description) {
            invalid++
            continue
          }

          if (deduplicate && userId) {
            const rowDate = row.date ? new Date(row.date) : new Date()
            const dayStart = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate())
            const dayEnd = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate() + 1)

            const dup = await Transaction.findOne({
              user_id: userId,
              description: { $regex: new RegExp(`^${row.description.trim()}$`, 'i') },
              amount: row.amount,
              date: { $gte: dayStart, $lt: dayEnd },
              is_deleted: false,
            })
            if (dup) {
              duplicates++
              continue
            }
          }

          const category = row.category || aiService.categorizeTransaction(row.description)
          await Transaction.create({
            _id: uuid(),
            user_id: userId,
            description: row.description.trim(),
            amount: Math.abs(parseFloat(row.amount)),
            type: row.type || (parseFloat(row.amount) < 0 ? 'expense' : 'income'),
            category: category || 'Other',
            currency: row.currency || 'INR',
            date: row.date ? new Date(row.date) : new Date(),
            notes: row.notes || 'Imported via Automated Statement Workflow',
          })
          imported++
        } catch (err) {
          invalid++
          errors.push(`${row.description || 'Row'}: ${err.message}`)
        }
      }

      if (userId && imported > 0) {
        await Notification.create({
          _id: uuid(),
          user_id: userId,
          message: `📥 Statement Import Complete: Added ${imported} transactions (${duplicates} duplicates skipped, ${invalid} invalid).`,
          type: 'success',
          category: 'import',
          data: { imported, duplicates, invalid },
        })
      }

      return {
        summary: `Imported ${imported} transactions (${duplicates} duplicates skipped, ${invalid} invalid)`,
        counts: { imported, duplicates, invalid, successfullyAdded: imported },
        errors,
      }
    }

    case 'anomaly.detected': {
      const { description, amount, severity = 'medium', expected = 0, zScore = 2.5 } = payload
      if (userId) {
        await Notification.create({
          _id: uuid(),
          user_id: userId,
          message: `⚠️ Unusual ${severity.toUpperCase()} Expense: ₹${amount.toLocaleString()} on "${description}". Average expected: ₹${expected.toLocaleString()}.`,
          type: 'warning',
          category: 'anomaly',
          data: { ...payload, actionRequired: true },
        })
      }
      return { summary: `Anomaly response alert dispatched for "${description}" (Severity: ${severity})` }
    }

    case 'insight.generate': {
      if (!userId) return { summary: 'No user ID' }
      const insights = await aiService.getInsights(userId)
      return { summary: `Generated ${insights.length} AI financial insights`, insights }
    }

    case 'notification.dispatch': {
      const { message, type = 'info', category = 'general', data = {}, emailTo } = payload
      let createdNotif = null
      if (userId) {
        createdNotif = await Notification.create({
          _id: uuid(),
          user_id: userId,
          message,
          type,
          category,
          data,
        })
      }

      if (emailTo) {
        try {
          const emailContent = buildNotificationEmail({ title: `Expense Tracker: ${category.toUpperCase()}`, body: message, type })
          await sendEmail({ to: emailTo, ...emailContent })
        } catch (err) {
          console.warn(`[fallback] Email notification failed: ${err.message}`)
        }
      }

      return { summary: `Notification dispatched: "${message.slice(0, 50)}..."`, notification: createdNotif }
    }

    default:
      return { summary: `No local fallback handler defined for event type ${eventType}` }
  }
}

/**
 * Trigger wrapper methods for convenience across controllers
 */
export const triggerTransactionWorkflow = (tx, user) => {
  return triggerWorkflow('transaction.created', {
    transactionId: tx._id || tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    date: tx.date,
    currency: tx.currency,
  }, {
    userId: user._id || user.id || tx.user_id,
    referenceId: tx._id || tx.id,
    workflowName: 'New Transaction Automation',
  })
}

export const triggerBudgetWorkflow = (budgetData, user) => {
  return triggerWorkflow('budget.threshold_crossed', budgetData, {
    userId: user._id || user.id,
    referenceId: budgetData.budgetId,
    workflowName: 'Budget Threshold Alert',
  })
}

export const triggerBillReminderWorkflow = (userId) => {
  return triggerWorkflow('bill.reminder_check', { checkTime: new Date().toISOString() }, {
    userId,
    workflowName: 'Bill Payment Reminder',
  })
}

export const triggerDebtReminderWorkflow = (userId) => {
  return triggerWorkflow('debt.reminder_check', { checkTime: new Date().toISOString() }, {
    userId,
    workflowName: 'Debt Payment Reminder',
  })
}

export const triggerSmartRebalancingWorkflow = (userId, month) => {
  return triggerWorkflow('budget.rebalance_check', { month }, {
    userId,
    workflowName: 'Smart Budget Rebalancing',
  })
}

export const triggerStatementImportWorkflow = (statementData, userId) => {
  return triggerWorkflow('statement.import', statementData, {
    userId,
    workflowName: 'Bank Statement Import',
  })
}

export const triggerAnomalyWorkflow = (anomalyData, userId) => {
  return triggerWorkflow('anomaly.detected', anomalyData, {
    userId,
    workflowName: 'Anomaly Response',
  })
}

export const triggerInsightWorkflow = (userId) => {
  return triggerWorkflow('insight.generate', { requestedAt: new Date().toISOString() }, {
    userId,
    workflowName: 'AI Financial Insight',
  })
}

export const triggerNotificationDispatch = (notificationData, userId) => {
  return triggerWorkflow('notification.dispatch', notificationData, {
    userId,
    workflowName: 'Notification Dispatcher',
  })
}
