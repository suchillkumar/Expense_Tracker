import nodemailer from 'nodemailer'
import { config } from '../config/index.js'

let transporter = null

function getTransporter() {
  if (transporter) return transporter
  if (!config.smtp.auth) return null
  transporter = nodemailer.createTransport(config.smtp)
  return transporter
}

export async function sendEmail({ to, subject, html }) {
  const transport = getTransporter()
  if (!transport) {
    console.warn('[Email] No SMTP configured — skipping email send')
    return { sent: false, reason: 'no_smtp' }
  }
  try {
    await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject,
      html,
    })
    return { sent: true }
  } catch (err) {
    console.error('[Email] Send failed:', err.message)
    return { sent: false, reason: err.message }
  }
}

export function buildNotificationEmail({ title, body, type }) {
  const color = type === 'alert' ? '#dc2626' : type === 'warning' ? '#d97706' : '#2563eb'
  const label = type === 'alert' ? 'Alert' : type === 'warning' ? 'Warning' : 'Info'
  return {
    subject: `[Expense Tracker] ${label}: ${title}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:${color};color:white;padding:12px 20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0;font-size:16px">💰 Expense Tracker — ${label}</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p style="font-size:15px;color:#374151;margin:0 0 12px">${title}</p>
          <p style="font-size:14px;color:#6b7280;margin:0">${body}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
          <p style="font-size:12px;color:#9ca3af;margin:0">
            Sent by Expense Tracker · ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `,
  }
}
