import 'dotenv/config'

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/expense_tracker',
  jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  },
  smtpFrom: process.env.SMTP_FROM || 'Expense Tracker <noreply@expensetracker.com>',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  n8n: {
    baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    webhookSecret: process.env.N8N_WEBHOOK_SECRET || 'n8n_expense_tracker_secret_key_2026',
    apiKey: process.env.N8N_API_KEY || '',
    enabled: process.env.N8N_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.N8N_TIMEOUT_MS || '5000', 10),
    webhooks: {
      transaction: process.env.N8N_WEBHOOK_TRANSACTION || '/webhook/transaction-created',
      budgetThreshold: process.env.N8N_WEBHOOK_BUDGET || '/webhook/budget-threshold',
      billReminder: process.env.N8N_WEBHOOK_BILL || '/webhook/bill-reminder',
      budgetRebalance: process.env.N8N_WEBHOOK_REBALANCE || '/webhook/budget-rebalance',
      statementImport: process.env.N8N_WEBHOOK_STATEMENT || '/webhook/statement-import',
      debtReminder: process.env.N8N_WEBHOOK_DEBT || '/webhook/debt-reminder',
      anomaly: process.env.N8N_WEBHOOK_ANOMALY || '/webhook/anomaly-detected',
      insight: process.env.N8N_WEBHOOK_INSIGHT || '/webhook/insight-generate',
      notification: process.env.N8N_WEBHOOK_NOTIFICATION || '/webhook/notification-dispatch',
    }
  }
}

