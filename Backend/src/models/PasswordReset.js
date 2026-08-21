import mongoose from 'mongoose'

const passwordResetSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  expires_at: { type: Date, required: true },
  used: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } })

export const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema)
