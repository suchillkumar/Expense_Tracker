import mongoose from 'mongoose'

const groupExpenseSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  group_id: { type: String, ref: 'Group', required: true },
  description: { type: String, required: true, maxlength: 500 },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paid_by: { type: String, ref: 'User', required: true },
  splits: { type: mongoose.Schema.Types.Mixed, default: [] },
  date: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

export const GroupExpense = mongoose.model('GroupExpense', groupExpenseSchema)
