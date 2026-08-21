import { getSession } from './api'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError && /failed to fetch|networkerror|network request failed/i.test(err.message)
}

export async function sendEmailNotification({
  to,
  title,
  body,
  type = 'info'
}: {
  to: string
  title: string
  body: string
  type?: string
}): Promise<{ sent: boolean; via?: string; reason?: string }> {
  if (!to) return { sent: false, reason: 'no_email' }

  try {
    const session = getSession()
    const res = await fetch(`${BASE}/notifications/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
      },
      body: JSON.stringify({ to, title, body, type })
    })

    if (res.ok) {
      const data = await res.json()
      if (data.sent) return { sent: true, via: 'smtp' }
      return { sent: false, reason: data.reason || 'smtp_failed' }
    }
    throw new Error('Request failed')
  } catch (err) {
    if (isNetworkError(err)) {
      openMailto(to, title, body)
      return { sent: true, via: 'mailto' }
    }
    return { sent: false, reason: err instanceof Error ? err.message : 'unknown' }
  }
}

function openMailto(to: string, title: string, body: string): void {
  const subject = encodeURIComponent(`[Expense Tracker] ${title}`)
  const text = encodeURIComponent(`${title}\n\n${body}\n\n— Sent by Expense Tracker`)
  const link = `mailto:${to}?subject=${subject}&body=${text}`
  const a = document.createElement('a')
  a.href = link
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
