import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  token_jti: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  last_used_at: { type: Date, default: Date.now },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

sessionSchema.index({ user_id: 1 })
sessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 })

export const Session = mongoose.model('Session', sessionSchema)
