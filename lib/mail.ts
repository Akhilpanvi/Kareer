import 'server-only'

// Transactional email via Resend's HTTP API (free tier: 3,000/month). Domain DNS lives in Cloudflare.
export const mailEnabled = () => !!process.env.RESEND_API_KEY
export const resetEnabled = () => mailEnabled() || process.env.NODE_ENV !== 'production'
export const appUrl = () => (process.env.APP_URL ?? 'https://kareers.klef.me').replace(/\/$/, '')

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set')
    return console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`)
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? 'Kareers <no-reply@kareers.klef.me>', to, subject, text, html }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

export function resetEmail(name: string, url: string) {
  return {
    subject: 'Reset your Kareers password',
    text: `Hi ${name},\n\nSomeone asked to reset the password for your Kareers account. Open this link within 30 minutes to choose a new one:\n\n${url}\n\nIf you didn't ask for this, ignore this email — your password won't change.\n\nPlacement Cell · KL University`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-size:15px;font-weight:600;margin:0 0 20px">Kareers · Placement Cell</p>
  <p>Hi ${esc(name)},</p>
  <p>Someone asked to reset the password for your Kareers account. This link expires in 30 minutes.</p>
  <p style="margin:28px 0"><a href="${esc(url)}" style="background:#a41c24;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#71717a">If you didn't ask for this, ignore this email — your password won't change.</p>
  <p style="font-size:12px;color:#a1a1aa;margin-top:32px">KL University · kareers.klef.me</p>
</div>`,
  }
}
