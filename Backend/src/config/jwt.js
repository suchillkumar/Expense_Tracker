import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config/index.js'

export function generateAccessToken(userId) {
  const jti = uuidv4()
  return jwt.sign({ sub: userId, type: 'access', jti }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  })
}

export function generateRefreshToken(userId) {
  const jti = uuidv4()
  return jwt.sign({ sub: userId, type: 'refresh', jti }, config.jwtSecret, {
    expiresIn: '30d',
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret)
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtSecret)
}
