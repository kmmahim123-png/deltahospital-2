import { NextResponse } from 'next/server'
import { validateCredentials, createSessionToken, SESSION_COOKIE_NAME, AdminRole } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    }

    const { role, password } = body

    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 })
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const isValid = validateCredentials(role as AdminRole, password)
    if (!isValid) {
      return NextResponse.json(
        { error: role === 'superadmin' ? 'Incorrect Super Admin Password!' : 'Incorrect Admin Password!' },
        { status: 401 }
      )
    }

    const token = createSessionToken(role as AdminRole)

    const response = NextResponse.json({
      success: true,
      role,
      message: 'Authentication successful',
    })

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7, // 7 days
    })

    return response
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Authentication error' },
      { status: 500 }
    )
  }
}
