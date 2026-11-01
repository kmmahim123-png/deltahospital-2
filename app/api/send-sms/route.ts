import { NextResponse } from 'next/server'
import { sendSmsNotification } from '@/lib/sms'

// In-memory rate limiting map (IP/phone to timestamps)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>()

function checkRateLimit(key: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key) || { count: 0, lastReset: now }

  if (now - entry.lastReset > windowMs) {
    entry.count = 1
    entry.lastReset = now
    rateLimitMap.set(key, entry)
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count += 1
  rateLimitMap.set(key, entry)
  return true
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
    if (!checkRateLimit(ip, 15, 60000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { phone, message } = body

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Valid phone number is required' }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    if (message.length > 500) {
      return NextResponse.json({ error: 'Message exceeds maximum allowed length' }, { status: 400 })
    }

    const result = await sendSmsNotification({
      phone,
      message: message.trim(),
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to dispatch SMS' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
