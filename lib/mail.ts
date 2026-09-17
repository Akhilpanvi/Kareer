import 'server-only'
import nodemailer, { type Transporter } from 'nodemailer'

// Transactional email over SMTP (e.g. Gmail with an App Password).
export const mailEnabled = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD)
export const resetEnabled = () => mailEnabled() || process.env.NODE_ENV !== 'production'
export const appUrl = () => (process.env.APP_URL ?? 'https://kloop.klef.me').replace(/\/$/, '')

const g = globalThis as unknown as { smtp?: Transporter }

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  if (!mailEnabled()) {
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured')
    return console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`)
  }
  g.smtp ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true', // false = STARTTLS on 587
    requireTLS: process.env.SMTP_SECURE !== 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })
  await g.smtp.sendMail({ from: process.env.SMTP_FROM ?? `Kloop <${process.env.SMTP_USER}>`, to, subject, text, html })
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)

export function resetEmail(name: string, url: string) {
  return {
    subject: 'Reset your Kloop password',
    text: `Hi ${name},\n\nSomeone asked to reset the password for your Kloop account. Open this link within 30 minutes to choose a new one:\n\n${url}\n\nIf you didn't ask for this, ignore this email — your password won't change.\n\nPlacement Cell · KL University`,
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#18181b">
  <p style="font-size:15px;font-weight:600;margin:0 0 20px">Kloop · Placement Cell</p>
  <p>Hi ${esc(name)},</p>
  <p>Someone asked to reset the password for your Kloop account. This link expires in 30 minutes.</p>
  <p style="margin:28px 0"><a href="${esc(url)}" style="background:#a41c24;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;display:inline-block">Choose a new password</a></p>
  <p style="font-size:13px;color:#71717a">If you didn't ask for this, ignore this email — your password won't change.</p>
  <p style="font-size:12px;color:#a1a1aa;margin-top:32px">KL University · kloop.klef.me</p>
</div>`,
  }
}
