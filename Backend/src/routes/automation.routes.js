import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { asyncHandler } from '../utils/errors.js'
import * as automationController from '../controllers/automationController.js'

const router = Router()

// Inbound webhook from n8n (Secured via HMAC/Secret header verification)
router.post('/webhooks/inbound', asyncHandler(automationController.handleInboundWebhook))

// All user endpoints require authentication
router.use(authenticate)

// Automation Center Overview & Statistics
router.get('/overview', asyncHandler(automationController.getAutomationOverview))

// Automation Execution Logs & Retries
router.get('/logs', asyncHandler(automationController.getAutomationLogs))
router.post('/logs/:id/retry', asyncHandler(automationController.retryAutomationLog))

// User Automation Settings & Toggles
router.patch('/settings', asyncHandler(automationController.updateAutomationSettings))

// Manual Workflow Trigger Testing
router.post('/manual-trigger', asyncHandler(automationController.triggerManualWorkflow))

// Anomaly Alert User Response
router.post('/anomaly/respond', asyncHandler(automationController.respondToAnomaly))

// Smart Budget Rebalance Actions
router.post('/rebalance/:recommendationId/apply', asyncHandler(automationController.applyBudgetRebalance))
router.post('/rebalance/:recommendationId/dismiss', asyncHandler(automationController.dismissBudgetRebalance))

// Bills Automation & Tracking
router.get('/bills', asyncHandler(automationController.getBills))
router.post('/bills', asyncHandler(automationController.createBill))
router.put('/bills/:id', asyncHandler(automationController.updateBill))
router.delete('/bills/:id', asyncHandler(automationController.deleteBill))

// Debts Automation & Tracking
router.get('/debts', asyncHandler(automationController.getDebts))
router.post('/debts', asyncHandler(automationController.createDebt))
router.put('/debts/:id', asyncHandler(automationController.updateDebt))
router.post('/debts/:id/pay', asyncHandler(automationController.recordDebtPayment))
router.delete('/debts/:id', asyncHandler(automationController.deleteDebt))

export default router
