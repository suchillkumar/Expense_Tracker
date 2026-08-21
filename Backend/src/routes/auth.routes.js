import { Router } from 'express'
import bcrypt from 'bcrypt'
import { User } from '../models/User.js'
import { PasswordReset } from '../models/PasswordReset.js'
import { AppError, asyncHandler } from '../utils/errors.js'
import { authenticate } from '../middleware/auth.js'
import * as authController from '../controllers/authController.js'

function uuid() { return crypto.randomUUID() }

const router = Router()

router.post('/register', asyncHandler(authController.register))
router.post('/login', asyncHandler(authController.login))
router.post('/google', asyncHandler(authController.googleLogin))
router.post('/refresh', asyncHandler(authController.refresh))
router.post('/logout', authenticate, asyncHandler(authController.logout))
router.get('/me', authenticate, asyncHandler(authController.getCurrentUser))
router.post('/onboarding', authenticate, asyncHandler(authController.completeOnboarding))
router.patch('/profile', authenticate, asyncHandler(authController.updateProfile))
router.patch('/password', authenticate, asyncHandler(authController.changePassword))


router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return res.json({ message: 'If an account exists, a reset email will be sent.' })

  const token = uuid()
  const expiresAt = new Date(Date.now() + 3600000)
  await PasswordReset.create({ _id: uuid(), user_id: user._id, token, expires_at: expiresAt })
  console.log(`Password reset token for ${email}: ${token}`)
  res.json({ message: 'If an account exists, a reset email will be sent.', token })
}))

router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, new_password } = req.body
  if (!token || !new_password || new_password.length < 8) throw new AppError('Invalid request', 400, 'BAD_REQUEST')

  const reset = await PasswordReset.findOne({ token, expires_at: { $gt: new Date() }, used: false })
  if (!reset) throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN')

  const passwordHash = await bcrypt.hash(new_password, 12)
  await User.findByIdAndUpdate(reset.user_id, { $set: { password_hash: passwordHash } })
  await PasswordReset.findByIdAndUpdate(reset._id, { $set: { used: true } })
  res.json({ message: 'Password reset successfully' })
}))

export default router
