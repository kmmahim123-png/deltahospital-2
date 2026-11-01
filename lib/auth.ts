import crypto from 'crypto'

export type AdminRole = 'admin' | 'superadmin'

export interface SessionData {
  role: AdminRole
  exp: number
}

const SESSION_COOKIE_NAME = 'delta_admin_session'
const DEFAULT_SECRET = 'delta-hospital-secure-jwt-auth-token-key-2026-vibe96'

function getSecret(): string {
  return process.env.AUTH_SESSION_SECRET || DEFAULT_SECRET
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function safeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export function validateCredentials(role: AdminRole, password: string): boolean {
  if (!password) return false

  const expectedAdminPass = process.env.ADMIN_PASSWORD || 'delta123'
  const expectedSuperAdminPass = process.env.SUPERADMIN_PASSWORD || 'super123'

  if (role === 'superadmin') {
    return safeCompare(password, expectedSuperAdminPass)
  }

  if (role === 'admin') {
    return safeCompare(password, expectedAdminPass)
  }

  return false
}

export function createSessionToken(role: AdminRole, maxAgeSeconds = 86400 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + maxAgeSeconds
  const payload = JSON.stringify({ role, exp })
  const base64Payload = Buffer.from(payload).toString('base64url')

  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(base64Payload)
  const signature = hmac.digest('base64url')

  return `${base64Payload}.${signature}`
}

export function verifySessionToken(token: string | undefined): { valid: boolean; role?: AdminRole } {
  if (!token || typeof token !== 'string') {
    return { valid: false }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false }
  }

  const [base64Payload, signature] = parts

  const hmac = crypto.createHmac('sha256', getSecret())
  hmac.update(base64Payload)
  const expectedSignature = hmac.digest('base64url')

  if (!safeCompare(signature, expectedSignature)) {
    return { valid: false }
  }

  try {
    const raw = Buffer.from(base64Payload, 'base64url').toString('utf8')
    const parsed: SessionData = JSON.parse(raw)

    const now = Math.floor(Date.now() / 1000)
    if (parsed.exp < now) {
      return { valid: false }
    }

    if (parsed.role !== 'admin' && parsed.role !== 'superadmin') {
      return { valid: false }
    }

    return { valid: true, role: parsed.role }
  } catch {
    return { valid: false }
  }
}

export { SESSION_COOKIE_NAME }
