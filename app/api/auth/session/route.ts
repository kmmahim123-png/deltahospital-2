import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    const verification = verifySessionToken(sessionToken)

    if (!verification.valid || !verification.role) {
      return NextResponse.json({ authenticated: false, role: null })
    }

    return NextResponse.json({
      authenticated: true,
      role: verification.role,
    })
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, role: null }, { status: 500 })
  }
}
