import mongoose from 'mongoose'

const automationLogSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  workflow_name: { type: String, required: true },
  event_type: { type: String, required: true },
  reference_id: { type: String, default: null },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'fallback'],
    default: 'pending',
    index: true,
  },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  response_data: { type: mongoose.Schema.Types.Mixed, default: null },
  error_message: { type: String, default: null },
  retry_count: { type: Number, default: 0 },
  max_retries: { type: Number, default: 3 },
  duration_ms: { type: Number, default: 0 },
  action_summary: { type: String, default: '' },
  executed_by: { type: String, enum: ['n8n', 'backend_fallback', 'manual_trigger'], default: 'n8n' },
  started_at: { type: Date, default: Date.now },
  completed_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

automationLogSchema.index({ user_id: 1, created_at: -1 })
automationLogSchema.index({ event_type: 1 })

export const AutomationLog = mongoose.model('AutomationLog', automationLogSchema)
