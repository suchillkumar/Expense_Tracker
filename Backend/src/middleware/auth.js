import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { Session } from '../models/Session.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/errors.js'
import { generateAccessToken, generateRefreshToken } from '../config/jwt.js'

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('No token provided', 401, 'NO_TOKEN'))
    }

    const token = authHeader.split(' ')[1]
    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch (err) {
      if (err.name === 'TokenExpiredError') return next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'))
      return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'))
    }

    const session = await Session.findOne({
      token_jti: decoded.jti || decoded.sub,
      expires_at: { $gt: new Date() },
    })

    if (!session) {
      return next(new AppError('Session expired or invalid', 401, 'INVALID_SESSION'))
    }

    const user = await User.findById(session.user_id)
    if (!user) {
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'))
    }

    req.user = {
      id: user._id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    }
    req.sessionId = session._id

    await Session.findByIdAndUpdate(session._id, { last_used_at: new Date() })
    next()
  } catch (err) {
    next(err)
  }
}

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()

  try {
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, config.jwtSecret)
    const session = await Session.findOne({
      token_jti: decoded.jti || decoded.sub,
      expires_at: { $gt: new Date() },
    })
    if (session) {
      const user = await User.findById(session.user_id)
      if (user) req.user = { id: user._id, email: user.email, name: user.name, timezone: user.timezone }
    }
  } catch {
    // ignore
  }
  next()
}

export const createSession = async (userId) => {
  const accessToken = generateAccessToken(userId)
  const refreshToken = generateRefreshToken(userId)
  const decoded = jwt.decode(accessToken)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await Session.create({
    _id: crypto.randomUUID(),
    user_id: userId,
    token_jti: decoded.jti,
    expires_at: expiresAt,
  })

  return { accessToken, refreshToken, expiresAt }
}

export const revokeSession = async (token) => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret)
    await Session.deleteOne({ token_jti: decoded.jti || decoded.sub })
  } catch {
    // ignore
  }
}
