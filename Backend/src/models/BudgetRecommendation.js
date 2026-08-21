import mongoose from 'mongoose'

const budgetRecommendationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  month: { type: String, required: true },
  source_category: { type: String, required: true },
  target_category: { type: String, required: true },
  reallocate_amount: { type: Number, required: true, min: 1 },
  source_current_budget: { type: Number, default: 0 },
  source_spent: { type: Number, default: 0 },
  target_current_budget: { type: Number, default: 0 },
  target_spent: { type: Number, default: 0 },
  reason: { type: String, required: true },
  ai_confidence: { type: Number, default: 0.9 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true,
  },
  applied_at: { type: Date, default: null },
  dismissed_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

budgetRecommendationSchema.index({ user_id: 1, month: 1, status: 1 })

export const BudgetRecommendation = mongoose.model('BudgetRecommendation', budgetRecommendationSchema)
