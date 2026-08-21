import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import * as dataController from '../controllers/dataController.js'
import { sendEmail, buildNotificationEmail } from '../services/email.service.js'

const router = Router()
router.use(authenticate)

/* Settings */
router.get('/settings', asyncHandler(dataController.getSettings))
router.patch('/settings', asyncHandler(dataController.updateSettings))

/* Transactions */
router.get('/transactions', asyncHandler(dataController.getTransactions))
router.get('/transactions/:id', asyncHandler(dataController.getTransaction))
router.post('/transactions', asyncHandler(dataController.createTransaction))
router.put('/transactions/:id', asyncHandler(dataController.updateTransaction))
router.delete('/transactions/:id', asyncHandler(dataController.deleteTransaction))
router.post('/transactions/import', asyncHandler(dataController.importTransactions))

/* Budgets */
router.get('/budgets', asyncHandler(dataController.getBudgets))
router.post('/budgets', asyncHandler(dataController.createBudget))
router.put('/budgets/:id', asyncHandler(dataController.updateBudget))
router.delete('/budgets/:id', asyncHandler(dataController.deleteBudget))

/* Financial Goals (Section 15) */
router.get('/goals', asyncHandler(dataController.getGoals))
router.post('/goals', asyncHandler(dataController.createGoal))
router.get('/goals/:id', asyncHandler(dataController.getGoal))
router.put('/goals/:id', asyncHandler(dataController.updateGoal))
router.post('/goals/:id/contribute', asyncHandler(dataController.contributeGoal))
router.delete('/goals/:id', asyncHandler(dataController.deleteGoal))

/* Recurring Transactions (Section 16) */
router.get('/recurring', asyncHandler(dataController.getRecurring))
router.post('/recurring', asyncHandler(dataController.createRecurring))
router.put('/recurring/:id', asyncHandler(dataController.updateRecurring))
router.post('/recurring/:id/execute', asyncHandler(dataController.executeRecurring))
router.post('/recurring/execute-due', asyncHandler(dataController.executeRecurring))
router.delete('/recurring/:id', asyncHandler(dataController.deleteRecurring))

/* Group Expenses (Section 17) */
router.get('/groups', asyncHandler(dataController.getGroups))
router.get('/groups/:id', asyncHandler(dataController.getGroup))
router.post('/groups', asyncHandler(dataController.createGroup))
router.put('/groups/:id', asyncHandler(dataController.updateGroup))
router.delete('/groups/:id', asyncHandler(dataController.deleteGroup))

router.get('/group-expenses', asyncHandler(dataController.getGroupExpenses))
router.post('/group-expenses', asyncHandler(dataController.createGroupExpense))
router.delete('/group-expenses/:id', asyncHandler(dataController.deleteGroupExpense))
router.get('/settlements', asyncHandler(dataController.getSettlementPlan))

/* Notifications */
router.get('/notifications', asyncHandler(dataController.getNotifications))
router.post('/notifications', asyncHandler(dataController.createNotification))
router.patch('/notifications/read', asyncHandler(dataController.markNotificationsRead))
router.delete('/notifications/:id', asyncHandler(dataController.deleteNotification))

/* Analytics & Reports (Section 21 & 22) */
router.get('/analytics', asyncHandler(dataController.getAnalytics))
router.get('/forecast', asyncHandler(dataController.getForecast))
router.get('/expenses/summary', asyncHandler(dataController.getExpenseSummary))
router.get('/reports/monthly', asyncHandler(dataController.getMonthlyReport))
router.get('/export/csv', asyncHandler(dataController.exportCSV))

/* Audit Logs */
router.get('/audit', asyncHandler(dataController.getAuditLog))

/* Email Notifications */
router.post('/notifications/email', asyncHandler(async (req, res) => {
  const { to, title, body, type } = req.body
  if (!to || !title || !body) {
    throw new AppError('Missing required fields: to, title, body', 400, 'VALIDATION_ERROR')
  }
  const emailContent = buildNotificationEmail({ title, body, type: type || 'info' })
  const result = await sendEmail({ to, ...emailContent })
  res.json(result)
}))

/* User Account Deletion */
router.delete('/users/account', asyncHandler(dataController.deleteAccount))

export default router
