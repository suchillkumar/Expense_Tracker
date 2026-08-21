import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { User } from '../models/User.js'
import { Session } from '../models/Session.js'
import { Settings } from '../models/Settings.js'
import { Budget } from '../models/Budget.js'
import { PasswordReset } from '../models/PasswordReset.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { createSession, revokeSession } from '../middleware/auth.js'
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema, onboardingSchema } from '../utils/validators.js'

function uuid() { return crypto.randomUUID() }

function sanitizeUser(user) {
  if (!user) return null
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    avatarUrl: user.avatar_url || '',
    age: user.age || null,
    occupation: user.occupation || '',
    monthlyIncome: user.monthly_income || 0,
    preferredCurrency: user.preferred_currency || 'INR',
    monthlySavingsGoal: user.monthly_savings_goal || 0,
    financialGoal: user.financial_goal || 'Savings',
    onboardingCompleted: Boolean(user.onboarding_completed),
    timezone: user.timezone || 'Asia/Kolkata',
    createdAt: user.created_at,
  }
}

export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body)

  if (data.confirm_password && data.password !== data.confirm_password) {
    throw new AppError('Passwords do not match', 400, 'PASSWORD_MISMATCH')
  }

  const existing = await User.findOne({ email: data.email.toLowerCase() })
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')

  const passwordHash = await bcrypt.hash(data.password, 12)
  const userId = uuid()

  const newUser = await User.create({
    _id: userId,
    name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
    phone: data.phone?.trim() || '',
    password_hash: passwordHash,
    onboarding_completed: false,
  })

  await Settings.create({
    _id: userId,
    user_id: userId,
    base_currency: 'INR',
    user_name: data.name.trim(),
    email: data.email.toLowerCase().trim(),
  })

  const { accessToken, refreshToken } = await createSession(userId)
  res.status(201).json({
    user: sanitizeUser(newUser),
    accessToken,
    refreshToken,
  })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body)
  const user = await User.findOne({ email: email.toLowerCase().trim() })
  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')

  const valid = await bcrypt.compare(password, user.password_hash)
  if (!valid) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS')

  const { accessToken, refreshToken } = await createSession(user._id)
  res.json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  })
})

export const completeOnboarding = asyncHandler(async (req, res) => {
  const data = onboardingSchema.parse(req.body)
  const userId = req.user.id

  const setFields = {
    onboarding_completed: true,
  }
  const monthlyIncome = data.monthly_income ?? data.monthlyIncome

  const preferredCurrency = data.preferred_currency ?? data.preferredCurrency
  const monthlySavingsGoal = data.monthly_savings_goal ?? data.monthlySavingsGoal
  const financialGoal = data.financial_goal ?? data.financialGoal
  const defaultBudgets = data.default_budgets ?? data.defaultBudgets
  const notifPrefs = data.notification_preferences ?? data.notificationPreferences

  if (data.age !== undefined) setFields.age = data.age
  if (data.occupation) setFields.occupation = data.occupation
  if (monthlyIncome !== undefined) setFields.monthly_income = monthlyIncome
  if (preferredCurrency) setFields.preferred_currency = preferredCurrency
  if (monthlySavingsGoal !== undefined) setFields.monthly_savings_goal = monthlySavingsGoal
  if (financialGoal) setFields.financial_goal = financialGoal

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: setFields },
    { new: true }
  )

  // Update Settings base_currency & notifications
  const settingsUpdate = {
    base_currency: preferredCurrency || 'INR',
  }
  if (notifPrefs) {
    const emailNotifs = notifPrefs.email_notifications ?? notifPrefs.emailNotifications
    const voiceAlerts = notifPrefs.voice_alerts ?? notifPrefs.voiceAlerts
    if (emailNotifs !== undefined) settingsUpdate.email_notifications = emailNotifs
    if (voiceAlerts !== undefined) settingsUpdate.voice_alerts = voiceAlerts
  }

  await Settings.findOneAndUpdate(
    { user_id: userId },
    { $set: settingsUpdate },
    { upsert: true }
  )

  let budgetsCreated = 0
  // Initialize Default Budgets if provided
  if (defaultBudgets && typeof defaultBudgets === 'object') {
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    for (const [category, limitAmount] of Object.entries(defaultBudgets)) {
      if (typeof limitAmount === 'number' && limitAmount > 0) {
        await Budget.findOneAndUpdate(
          { user_id: userId, category, month: currentMonth },
          { $set: { _id: uuid(), limit_amount: limitAmount, period: 'monthly', alert_threshold: 80 } },
          { upsert: true }
        )
        budgetsCreated++
      }
    }
  }


  res.json({
    success: true,
    user: sanitizeUser(updatedUser),
  })
})

export const googleLogin = asyncHandler(async (req, res) => {
  const { id_token } = req.body
  if (!id_token) throw new AppError('Google ID token is required', 400, 'MISSING_TOKEN')

  const { verifyGoogleToken } = await import('../config/oauth.js')
  const payload = await verifyGoogleToken(id_token)

  let user = await User.findOne({ email: payload.email.toLowerCase() })
  if (!user) {
    const userId = uuid()
    user = await User.create({
      _id: userId,
      name: payload.name,
      email: payload.email.toLowerCase(),
      provider: 'google',
      google_id: payload.googleId,
      email_verified: true,
      onboarding_completed: false,
    })
    await Settings.create({
      _id: userId,
      user_id: userId,
      base_currency: 'INR',
      user_name: payload.name,
      email: payload.email.toLowerCase(),
    })
  }

  const { accessToken, refreshToken } = await createSession(user._id)
  res.json({
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  })
})

export const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body
  if (!refresh_token) throw new AppError('Refresh token required', 400, 'MISSING_REFRESH_TOKEN')

  const decoded = jwt.verify(refresh_token, config.jwtSecret)
  const session = await Session.findOne({
    user_id: decoded.sub,
    expires_at: { $gt: new Date() },
  })
  if (!session) throw new AppError('No active session', 401, 'NO_ACTIVE_SESSION')

  const { accessToken, refreshToken } = await createSession(decoded.sub)
  await Session.findByIdAndDelete(session._id)
  res.json({ accessToken, refreshToken })
})

export const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    await revokeSession(token)
  }
  res.status(204).send()
})

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw new AppError('User not found', 404, 'NOT_FOUND')
  res.json(sanitizeUser(user))
})

export const updateProfile = asyncHandler(async (req, res) => {
  const updates = updateProfileSchema.parse(req.body)
  const setFields = {}

  if (updates.name) setFields.name = updates.name.trim()
  if (updates.email) setFields.email = updates.email.toLowerCase().trim()
  if (updates.phone !== undefined) setFields.phone = updates.phone.trim()
  if (updates.avatar_url !== undefined || updates.avatarUrl !== undefined) {
    setFields.avatar_url = updates.avatar_url ?? updates.avatarUrl
  }
  if (updates.age !== undefined) setFields.age = updates.age
  if (updates.occupation !== undefined) setFields.occupation = updates.occupation
  if (updates.monthly_income !== undefined || updates.monthlyIncome !== undefined) {
    setFields.monthly_income = updates.monthly_income ?? updates.monthlyIncome
  }
  if (updates.preferred_currency || updates.preferredCurrency) {
    setFields.preferred_currency = updates.preferred_currency ?? updates.preferredCurrency
  }
  if (updates.preferred_budget_period || updates.preferredBudgetPeriod) {
    setFields.preferred_budget_period = updates.preferred_budget_period ?? updates.preferredBudgetPeriod
  }
  if (updates.monthly_savings_goal !== undefined || updates.monthlySavingsGoal !== undefined) {
    setFields.monthly_savings_goal = updates.monthly_savings_goal ?? updates.monthlySavingsGoal
  }
  if (updates.financial_goal !== undefined || updates.financialGoal !== undefined) {
    setFields.financial_goal = updates.financial_goal ?? updates.financialGoal
  }
  if (updates.timezone) setFields.timezone = updates.timezone
  if (updates.theme) setFields.theme = updates.theme

  if (Object.keys(setFields).length === 0) {
    const u = await User.findById(req.user.id)
    return res.json(sanitizeUser(u))
  }

  const updated = await User.findByIdAndUpdate(req.user.id, { $set: setFields }, { new: true })
  res.json(sanitizeUser(updated))
})

export const changePassword = asyncHandler(async (req, res) => {
  const data = changePasswordSchema.parse(req.body)
  const current_password = data.current_password || data.currentPassword
  const new_password = data.new_password || data.newPassword

  const user = await User.findById(req.user.id)
  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD')

  const newHash = await bcrypt.hash(new_password, 12)
  await User.findByIdAndUpdate(req.user.id, { $set: { password_hash: newHash } })
  res.status(204).send()
})
