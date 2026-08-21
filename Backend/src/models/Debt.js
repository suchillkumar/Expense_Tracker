import mongoose from 'mongoose'

const debtSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  creditor: { type: String, default: '' },
  total_amount: { type: Number, required: true, min: 0 },
  remaining_balance: { type: Number, required: true, min: 0 },
  minimum_payment: { type: Number, default: 0, min: 0 },
  interest_rate: { type: Number, default: 0, min: 0 },
  due_date: { type: Date, required: true },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['active', 'settled', 'overdue', 'paused'],
    default: 'active',
  },
  last_payment_date: { type: Date, default: null },
  last_reminded_at: { type: Date, default: null },
  notes: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

debtSchema.index({ user_id: 1, due_date: 1 })
debtSchema.index({ status: 1 })

export const Debt = mongoose.model('Debt', debtSchema)
