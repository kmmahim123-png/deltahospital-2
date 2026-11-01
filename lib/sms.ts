/**
 * Server-Side SMS Service (GioSMS Integration)
 * Credentials are read exclusively from server environment variables.
 * Never leaks API tokens to the client.
 */

export interface SendSmsParams {
  phone: string
  message: string
}

export interface SendSmsResponse {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendSmsNotification({
  phone,
  message,
}: SendSmsParams): Promise<SendSmsResponse> {
  const apiKey = process.env.GIOSMS_API_KEY
  const senderId = process.env.GIOSMS_SENDER_ID || '8809666720320'

  if (!apiKey) {
    console.warn('[SMS] GIOSMS_API_KEY not configured. Skipping SMS dispatch.')
    return { success: false, error: 'SMS service is not configured.' }
  }

  // Clean and validate Bangladeshi phone number (11 digits, typically 01XXXXXXXXX)
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length !== 11) {
    return { success: false, error: 'Invalid phone number length. Expected 11 digits.' }
  }

  try {
    const res = await fetch('https://client.giosms.com/api/v1/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        to: `88${cleanPhone}`,
        message,
        sender_id: senderId,
        type: 'transactional',
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error('[SMS] Delivery failed with HTTP status:', res.status)
      return { success: false, error: data?.message || `HTTP ${res.status}` }
    }

    return { success: true, messageId: data?.message_id || 'sent' }
  } catch (err: any) {
    console.error('[SMS] Exception during SMS transmission:', err?.message || err)
    return { success: false, error: err?.message || 'Network error' }
  }
}
