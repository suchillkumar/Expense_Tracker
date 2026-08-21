import mongoose from 'mongoose'

const recurringTemplateSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  description: { type: String, required: true, maxlength: 500 },
  amount: { type: Number, required: true },
  type: { type: String, required: true, enum: ['income', 'expense', 'transfer'] },
  category: { type: String, required: true, maxlength: 100 },
  recurrence: { type: String, required: true, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
  start_date: { type: Date, required: true },
  end_date: { type: Date, default: null },
  next_run_date: { type: Date, required: true },
  is_active: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

recurringTemplateSchema.index({ user_id: 1 })

export const RecurringTemplate = mongoose.model('RecurringTemplate', recurringTemplateSchema)
