import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  category: { type: String, required: true, maxlength: 100 },
  limit_amount: { type: Number, required: true },
  spent_amount: { type: Number, default: 0 },
  period: { type: String, default: 'monthly', enum: ['weekly', 'monthly', 'yearly'] },
  month: { type: String, required: true },
  alert_threshold: { type: Number, default: 80 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

budgetSchema.index({ user_id: 1, month: 1 })

export const Budget = mongoose.model('Budget', budgetSchema)
