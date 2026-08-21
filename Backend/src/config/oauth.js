import { OAuth2Client } from 'google-auth-library'
import { config } from '../config/index.js'

export const googleClient = new OAuth2Client(
  config.googleClientId,
  config.googleClientSecret,
  `${config.frontendUrl}/auth/callback`
)

export async function verifyGoogleToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.googleClientId,
  })
  const payload = ticket.getPayload()
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    emailVerified: payload.email_verified,
    picture: payload.picture,
  }
}
