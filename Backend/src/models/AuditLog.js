import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  action: { type: String, required: true },
  entity_type: { type: String, required: true },
  entity_id: { type: String, required: true },
  old_values: { type: mongoose.Schema.Types.Mixed, default: null },
  new_values: { type: mongoose.Schema.Types.Mixed, default: null },
  ip_address: { type: String, default: null },
  user_agent: { type: String, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

auditLogSchema.index({ user_id: 1 })

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
