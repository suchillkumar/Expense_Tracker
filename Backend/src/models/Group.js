import mongoose from 'mongoose'

const groupSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  name: { type: String, required: true, maxlength: 255 },
  description: { type: String, default: '' },
  members: { type: mongoose.Schema.Types.Mixed, default: [] },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })

groupSchema.index({ user_id: 1 })

export const Group = mongoose.model('Group', groupSchema)
