import { v4 as uuidv4 } from 'uuid'

// Admin password - in production, use environment variable
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

// Simple token store (in-memory, resets on server restart)
export const validTokens = new Set()

// Auth middleware
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Generate new token
export function createToken() {
  const token = uuidv4()
  validTokens.add(token)
  return token
}

// Remove token
export function removeToken(token) {
  validTokens.delete(token)
}

// Check if token is valid
export function isValidToken(token) {
  return token && validTokens.has(token)
}
