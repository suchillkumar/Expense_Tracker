import mongoose from 'mongoose'

const automationSettingSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true, unique: true },
  workflows: {
    transaction_automation: { type: Boolean, default: true },
    budget_threshold_alerts: { type: Boolean, default: true },
    bill_reminders: { type: Boolean, default: true },
    smart_rebalancing: { type: Boolean, default: true },
    statement_import: { type: Boolean, default: true },
    debt_reminders: { type: Boolean, default: true },
    anomaly_response: { type: Boolean, default: true },
    ai_insights: { type: Boolean, default: true },
    notification_dispatcher: { type: Boolean, default: true },
  },
  channels: {
    in_app: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    voice: { type: Boolean, default: false },
  },
  thresholds: {
    budget_alert_pct: { type: Number, default: 80 },
    anomaly_z_score: { type: Number, default: 2.0 },
    bill_reminder_days: { type: [Number], default: [7, 3, 1, 0] },
    debt_reminder_days: { type: [Number], default: [7, 3, 1, 0] },
  },
  hold_high_severity_anomalies: { type: Boolean, default: true },
  cooldown_minutes: { type: Number, default: 60 },
  custom_webhook_url: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

export const AutomationSetting = mongoose.model('AutomationSetting', automationSettingSchema)
