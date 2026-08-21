import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  description: { type: String, required: true, maxlength: 500 },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['income', 'expense', 'transfer'] },
  category: { type: String, required: true, maxlength: 100 },
  currency: { type: String, default: 'INR' },
  exchange_rate: { type: Number, default: 1.0 },
  date: { type: Date, default: Date.now },
  recurrence: { type: String, default: 'none', enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'] },
  recurrence_end_date: { type: Date, default: null },
  group_id: { type: String, default: null },
  notes: { type: String, default: null },
  tags: { type: [String], default: [] },
  split_type: { type: String, default: 'none', enum: ['none', 'equal', 'custom'] },
  splits: { type: mongoose.Schema.Types.Mixed, default: [] },
  receipt_url: { type: String, default: null },
  payment_method: { type: String, default: null },
  is_deleted: { type: Boolean, default: false },
  deleted_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

transactionSchema.index({ user_id: 1 })
transactionSchema.index({ date: -1 })
transactionSchema.index({ category: 1 })

export const Transaction = mongoose.model('Transaction', transactionSchema)
