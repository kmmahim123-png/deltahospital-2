/**
 * Client-side SMS dispatcher that routes via our secure server endpoint.
 * Keeps all API keys, tokens, and third-party credentials hidden from the browser.
 */

export async function sendClientSms(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    })
    return res.ok
  } catch (err) {
    console.error('SMS dispatch error:', err)
    return false
  }
}
