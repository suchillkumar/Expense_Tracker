import mongoose from 'mongoose'

const settingsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  user_id: { type: String, ref: 'User', required: true, unique: true },
  base_currency: { type: String, default: 'INR' },
  user_name: { type: String, default: '' },
  email: { type: String, default: '' },
  voice_alerts: { type: Boolean, default: false },
  voice_alert_anomalies: { type: Boolean, default: false },
  meal_voice_alerts: { type: Boolean, default: false },
  email_notifications: { type: Boolean, default: false },
  breakfast_enabled: { type: Boolean, default: false },
  breakfast_time: { type: String, default: '07:30' },
  breakfast_message: { type: String, default: 'Time for breakfast. Have a healthy meal.' },
  lunch_enabled: { type: Boolean, default: false },
  lunch_time: { type: String, default: '12:30' },
  lunch_message: { type: String, default: 'Time for lunch. Take a break and eat well.' },
  dinner_enabled: { type: Boolean, default: false },
  dinner_time: { type: String, default: '19:30' },
  dinner_message: { type: String, default: 'Time for dinner. Enjoy your meal.' },
}, { timestamps: false })

export const Settings = mongoose.model('Settings', settingsSchema)
