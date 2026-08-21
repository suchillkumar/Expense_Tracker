import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(100),
  confirm_password: z.string().min(8).max(100).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const onboardingSchema = z.object({
  age: z.number().int().min(13).max(120).optional(),
  occupation: z.string().max(100).optional(),
  monthly_income: z.number().nonnegative().optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  preferred_currency: z.string().max(10).optional(),
  preferredCurrency: z.string().max(10).optional(),
  monthly_savings_goal: z.number().nonnegative().optional(),
  monthlySavingsGoal: z.number().nonnegative().optional(),
  financial_goal: z.string().max(100).optional(),
  financialGoal: z.string().max(100).optional(),
  default_budgets: z.record(z.number().nonnegative()).optional(),
  defaultBudgets: z.record(z.number().nonnegative()).optional(),
  notification_preferences: z.object({
    email_notifications: z.boolean().optional(),
    voice_alerts: z.boolean().optional(),
  }).optional(),
  notificationPreferences: z.object({
    emailNotifications: z.boolean().optional(),
    voiceAlerts: z.boolean().optional(),
  }).optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  email: z.string().email().max(255).optional(),
  phone: z.string().max(20).optional(),
  avatar_url: z.string().optional(),
  avatarUrl: z.string().optional(),
  age: z.number().int().min(13).max(120).optional(),
  occupation: z.string().max(100).optional(),
  monthly_income: z.number().nonnegative().optional(),
  monthlyIncome: z.number().nonnegative().optional(),
  preferred_currency: z.string().max(10).optional(),
  preferredCurrency: z.string().max(10).optional(),
  preferred_budget_period: z.string().max(20).optional(),
  preferredBudgetPeriod: z.string().max(20).optional(),
  monthly_savings_goal: z.number().nonnegative().optional(),
  monthlySavingsGoal: z.number().nonnegative().optional(),
  financial_goal: z.string().max(100).optional(),
  financialGoal: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  theme: z.string().max(20).optional(),
})


export const changePasswordSchema = z.object({
  current_password: z.string().min(1).optional(),
  currentPassword: z.string().min(1).optional(),
  new_password: z.string().min(8).max(100).optional(),
  newPassword: z.string().min(8).max(100).optional(),
}).refine(data => (data.current_password || data.currentPassword) && (data.new_password || data.newPassword), {
  message: 'Current password and new password are required'
})


export const transactionSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  category: z.string().min(1).max(100),
  currency: z.string().length(3).default('INR'),
  exchange_rate: z.number().positive().default(1),
  date: z.string().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  recurrence_end_date: z.string().datetime().optional(),
  group_id: z.string().optional().nullable(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  split_type: z.enum(['none', 'equal', 'custom']).default('none'),
  splits: z.array(z.object({
    user_id: z.string(),
    amount: z.number().nonnegative(),
    paid: z.boolean().optional(),
  })).optional(),
  receipt_url: z.string().url().optional().nullable(),
  payment_method: z.string().max(50).optional(),
})

export const budgetSchema = z.object({
  category: z.string().min(1).max(100),
  limit_amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']).default('monthly'),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  alert_threshold: z.number().int().min(0).max(100).default(80),
})

export const groupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  members: z.array(z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string().email().optional(),
  })).min(1),
})

export const groupExpenseSchema = z.object({
  group_id: z.string(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  currency: z.string().length(3).default('INR'),
  paid_by: z.string(),
  splits: z.array(z.object({
    user_id: z.string(),
    amount: z.number().nonnegative(),
    paid: z.boolean().default(false),
  })).min(1),
  date: z.string().datetime().optional(),
})

export const settingsSchema = z.object({
  base_currency: z.string().length(3).optional(),
  user_name: z.string().optional(),
  email: z.string().email().optional(),
  voice_alerts: z.boolean().optional(),
  voice_alert_anomalies: z.boolean().optional(),
  meal_voice_alerts: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  breakfast_enabled: z.boolean().optional(),
  breakfast_time: z.string().optional(),
  breakfast_message: z.string().optional(),
  lunch_enabled: z.boolean().optional(),
  lunch_time: z.string().optional(),
  lunch_message: z.string().optional(),
  dinner_enabled: z.boolean().optional(),
  dinner_time: z.string().optional(),
  dinner_message: z.string().optional(),
})

export const importSchema = z.object({
  rows: z.array(transactionSchema).min(1).max(1000),
  deduplicate: z.boolean().default(true),
})

export const goalSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().max(100).optional().default('General'),
  target_amount: z.number().positive(),
  current_amount: z.number().nonnegative().optional().default(0),
  target_date: z.string().min(1),
  color: z.string().max(50).optional().default('#0ea5e9'),
  notes: z.string().optional().nullable(),
  status: z.enum(['in_progress', 'completed', 'paused']).optional().default('in_progress'),
})

export const recurringSchema = z.object({
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  category: z.string().min(1).max(100),
  recurrence: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  start_date: z.string().min(1),
  end_date: z.string().optional().nullable(),
  next_run_date: z.string().optional(),
})

export const aiChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional().default([]),
})

