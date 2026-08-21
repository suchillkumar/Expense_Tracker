export type NotificationPermissionState = 'granted' | 'denied' | 'default'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission as NotificationPermissionState
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  const result = await Notification.requestPermission()
  return result as NotificationPermissionState
}

export function showNotification(title: string, body: string, tag?: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      tag: tag ?? title,
      requireInteraction: false
    })
  } catch {
    // notification failed silently
  }
}
