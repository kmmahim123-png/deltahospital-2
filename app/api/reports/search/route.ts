import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body.query !== 'string') {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 })
    }

    const rawQuery = body.query.trim()
    if (!rawQuery || rawQuery.length < 2 || rawQuery.length > 50) {
      return NextResponse.json({ labReports: [], bookingSlip: null })
    }

    // Sanitize query to prevent PostgREST syntax injection or wildcards
    const sanitized = rawQuery.replace(/[%_,()'"\\]/g, '').trim()
    if (!sanitized) {
      return NextResponse.json({ labReports: [], bookingSlip: null })
    }

    const cleanDigits = sanitized.replace(/\D/g, '')
    const isPhoneNumber = cleanDigits.length === 11 && (cleanDigits.startsWith('01') || cleanDigits.startsWith('8801'))

    // 1. Search lab_reports table
    let labReports: any[] = []
    if (isPhoneNumber) {
      const { data } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('phone', cleanDigits)
        .order('id', { ascending: false })
      labReports = data || []
    } else {
      const { data } = await supabase
        .from('lab_reports')
        .select('*')
        .eq('invoice_no', sanitized)
        .order('id', { ascending: false })
      labReports = data || []
    }

    if (labReports.length > 0) {
      return NextResponse.json({ labReports, bookingSlip: null })
    }

    // 2. Search bookings table if no lab report matched
    let bookingSlip: any = null
    const cleanSerial = sanitized.replace(/^[#EQ\s]+/, '')
    const numericSerial = parseInt(cleanSerial, 10)

    if (isPhoneNumber) {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('phone', cleanDigits)
        .order('id', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        bookingSlip = { ...data[0], is_booking_slip: true }
      }
    } else if (!isNaN(numericSerial) && numericSerial > 0 && numericSerial < 100000) {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('serial_number', numericSerial)
        .order('id', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        bookingSlip = { ...data[0], is_booking_slip: true }
      }
    }

    return NextResponse.json({ labReports, bookingSlip })
  } catch (err: any) {
    console.error('Report search error:', err)
    return NextResponse.json(
      { error: 'An error occurred during search' },
      { status: 500 }
    )
  }
}
