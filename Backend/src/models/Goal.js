import mongoose from 'mongoose'

const goalSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 255 },
  category: { type: String, default: 'General', maxlength: 100 },
  target_amount: { type: Number, required: true, min: 1 },
  current_amount: { type: Number, default: 0, min: 0 },
  target_date: { type: Date, required: true },
  color: { type: String, default: '#0ea5e9' },
  notes: { type: String, default: null },
  status: { type: String, default: 'in_progress', enum: ['in_progress', 'completed', 'paused'] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

goalSchema.index({ user_id: 1, target_date: 1 })

export const Goal = mongoose.model('Goal', goalSchema)
