import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isSpeechSupported,
  isSpeaking,
  getVoiceSystemStatus,
  speak,
  stopSpeaking,
  clearSpokenByPrefix,
  getLastVoiceLatencyMs,
  type VoiceSystemStatus
} from '../services/voiceService'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermissionState
} from '../services/notificationService'

export function useVoiceNotifications() {
  const [voiceStatus] = useState<VoiceSystemStatus>(() =>
    getVoiceSystemStatus()
  )
  const [speaking, setSpeaking] = useState(false)
  const [latency, setLatency] = useState<number | null>(() =>
    getLastVoiceLatencyMs()
  )
  const [notifPermission, setNotifPermission] = useState<NotificationPermissionState>(() =>
    getNotificationPermission()
  )
  const speakingRef = useRef(false)

  useEffect(() => {
    if (!isSpeechSupported()) return
    const interval = setInterval(() => {
      const s = isSpeaking()
      if (s !== speakingRef.current) {
        speakingRef.current = s
        setSpeaking(s)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const testVoice = useCallback(async (message?: string): Promise<number> => {
    const result = await speak(
      message || 'This is a test voice alert. Your AI notification system is working correctly.'
    )
    setLatency(result)
    return result
  }, [])

  const testMealAlert = useCallback(async (mealName: string, message: string): Promise<number> => {
    const result = await speak(message || `Time for ${mealName.toLowerCase()}.`)
    setLatency(result)
    return result
  }, [])

  const testSpendingAlert = useCallback(async (): Promise<number> => {
    const result = await speak(
      'Warning. You have reached 80 percent of your monthly spending budget.'
    )
    setLatency(result)
    return result
  }, [])

  const testAnomalyAlert = useCallback(async (): Promise<number> => {
    const result = await speak(
      'AI spending alert. An unusual transaction was detected.'
    )
    setLatency(result)
    return result
  }, [])

  const requestNotifPermission = useCallback(async (): Promise<NotificationPermissionState> => {
    const result = await requestNotificationPermission()
    setNotifPermission(result)
    return result
  }, [])

  return {
    voiceStatus,
    speaking,
    latency,
    notifPermission,
    speechSupported: isSpeechSupported(),
    notifSupported: isNotificationSupported(),
    testVoice,
    testMealAlert,
    testSpendingAlert,
    testAnomalyAlert,
    stopSpeaking,
    requestNotifPermission,
    clearSpokenByPrefix
  }
}
