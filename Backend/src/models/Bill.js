import mongoose from 'mongoose'

const billSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  category: { type: String, default: 'Bills' },
  due_date: { type: Date, required: true },
  recurrence: {
    type: String,
    enum: ['one-time', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly',
  },
  auto_pay: { type: Boolean, default: false },
  is_paid: { type: Boolean, default: false },
  paid_at: { type: Date, default: null },
  reminder_days: { type: [Number], default: [7, 3, 1, 0] },
  last_reminded_at: { type: Date, default: null },
  notes: { type: String, default: '' },
  payee_url: { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

billSchema.index({ user_id: 1, due_date: 1 })
billSchema.index({ is_paid: 1 })

export const Bill = mongoose.model('Bill', billSchema)
