import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { generateBudget } from '../services/aiBudget.service.js'
import * as aiService from '../services/ai.service.js'
import { aiChatSchema } from '../utils/validators.js'

const router = Router()
router.use(authenticate)

const budgetInputSchema = z.object({
  age: z.number().int().min(13).max(120),
  monthlySalary: z.number().min(0),
  monthlyExpenses: z.number().min(0).optional().default(0),
  savingsGoal: z.number().min(0).optional().default(0),
  financialGoal: z.string().max(100).optional().default('savings'),
})

// 1. AI Financial Assistant Chat (Section 14)
router.post('/chat', asyncHandler(async (req, res) => {
  const { message, history } = aiChatSchema.parse(req.body)
  const result = await aiService.aiChat(req.user.id, message, history)
  res.json(result)
}))

// 2. AI Budget Generator (Section 10)
const handleBudgetGen = asyncHandler(async (req, res) => {
  const data = budgetInputSchema.parse(req.body)
  const result = await generateBudget(req.user.id, data)
  res.json(result)
})
router.post('/budget-generate', handleBudgetGen)
router.post('/budget', handleBudgetGen)

// 3. AI Spending Analysis (Section 11)
const handleAnalyze = asyncHandler(async (req, res) => {
  const analysis = await aiService.analyzeSpending(req.user.id)
  res.json(analysis)
})
router.get('/analyze', handleAnalyze)
router.post('/analyze', handleAnalyze)

// 4. AI Expense Prediction (Section 12)
const handlePredict = asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months || req.body.months) || 3
  const prediction = await aiService.predictExpenses(req.user.id, months)
  res.json(prediction)
})
router.get('/predict', handlePredict)
router.post('/predict', handlePredict)

// 5. AI Saving Recommendations (Section 13)
const handleRecommend = asyncHandler(async (req, res) => {
  const recommendations = await aiService.getSavingRecommendations(req.user.id)
  res.json(recommendations)
})
router.get('/recommend', handleRecommend)
router.post('/recommend', handleRecommend)

// 6. Categorization & Anomalies
router.get('/categorize', asyncHandler(async (req, res) => {
  const description = req.query.description || req.query.q
  if (!description) throw new AppError('description is required', 400, 'BAD_REQUEST')
  const category = aiService.categorizeTransaction(String(description))
  res.json({ description, category })
}))

router.post('/categorize', asyncHandler(async (req, res) => {
  const description = req.body.description
  if (!description) throw new AppError('description is required', 400, 'BAD_REQUEST')
  const category = aiService.categorizeTransaction(String(description))
  res.json({ description, category })
}))

router.get('/anomalies', asyncHandler(async (req, res) => {
  const anomalies = await aiService.detectAnomalies(req.user.id)
  res.json({ anomalies })
}))

router.get('/forecast', asyncHandler(async (req, res) => {
  const months = parseInt(req.query.months) || 6
  const result = await aiService.forecastSpending(req.user.id, months)
  res.json(result)
}))

router.get('/insights', asyncHandler(async (req, res) => {
  const insights = await aiService.getInsights(req.user.id)
  res.json({ insights })
}))

export default router
