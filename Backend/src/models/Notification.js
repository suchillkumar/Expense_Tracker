import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info', enum: ['info', 'alert', 'warning', 'success'] },
  category: { type: String, default: 'general' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
  read_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

notificationSchema.index({ user_id: 1 })
notificationSchema.index({ user_id: 1, read: 1 })

export const Notification = mongoose.model('Notification', notificationSchema)
