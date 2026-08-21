import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 255 },
  email: { type: String, required: true, unique: true, lowercase: true, maxlength: 255 },
  phone: { type: String, default: '', maxlength: 20 },
  password_hash: { type: String, required: true },
  avatar_url: { type: String, default: '' },
  age: { type: Number, default: null, min: 13, max: 120 },
  occupation: { type: String, default: '' },
  monthly_income: { type: Number, default: 0, min: 0 },
  preferred_currency: { type: String, default: 'INR', maxlength: 10 },
  preferred_budget_period: { type: String, default: 'monthly', maxlength: 20 },
  monthly_savings_goal: { type: Number, default: 0, min: 0 },
  financial_goal: { type: String, default: 'Savings', maxlength: 100 },
  onboarding_completed: { type: Boolean, default: false },
  provider: { type: String, default: 'local' },
  google_id: { type: String, default: null },
  email_verified: { type: Boolean, default: false },
  timezone: { type: String, default: 'Asia/Kolkata', maxlength: 100 },
  theme: { type: String, default: 'light', maxlength: 20 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

export const User = mongoose.model('User', userSchema)
