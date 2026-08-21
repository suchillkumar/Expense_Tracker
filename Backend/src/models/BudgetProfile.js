import mongoose from 'mongoose'

const budgetProfileSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  age: { type: Number, required: true, min: 13, max: 120 },
  monthly_income: { type: Number, required: true, min: 0 },
  other_income: { type: Number, default: 0, min: 0 },
  employment_type: { type: String, default: 'employed' },
  monthly_fixed_expenses: { type: Number, default: 0, min: 0 },
  existing_savings: { type: Number, default: 0, min: 0 },
  current_debt: { type: Number, default: 0, min: 0 },
  financial_goal: { type: String, default: 'savings' },
  saving_target_percent: { type: Number, default: 20, min: 0, max: 100 },
  last_recommendation: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

budgetProfileSchema.index({ user_id: 1 }, { unique: true })

export const BudgetProfile = mongoose.model('BudgetProfile', budgetProfileSchema)
