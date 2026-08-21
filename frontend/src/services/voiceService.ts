let voicesCache: SpeechSynthesisVoice[] = []
let lastLatencyMs: number | null = null
let latencySamples: number[] = []
let voiceAlertCount = 0
let currentlySpeaking = false
const spokenThisSession = new Set<string>()

export type VoiceSystemStatus = 'ready' | 'waiting' | 'unavailable'

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const load = () => {
    voicesCache = window.speechSynthesis.getVoices()
  }
  load()
  window.speechSynthesis.onvoiceschanged = load
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function getSupportedVoices(): SpeechSynthesisVoice[] {
  if (voicesCache.length > 0) return voicesCache
  if (isSpeechSupported()) return window.speechSynthesis.getVoices()
  return []
}

export function getVoiceSystemStatus(): VoiceSystemStatus {
  if (!isSpeechSupported()) return 'unavailable'
  if (currentlySpeaking) return 'ready'
  return 'ready'
}

export function isSpeaking(): boolean {
  return currentlySpeaking
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel()
    currentlySpeaking = false
  }
}

export function getLastVoiceLatencyMs(): number | null {
  return lastLatencyMs
}

export function getLatencySamples(): number[] {
  return [...latencySamples]
}

export function getVoiceAlertCount(): number {
  return voiceAlertCount
}

export function hasSpoken(key: string): boolean {
  return spokenThisSession.has(key)
}

export function clearSpoken(key?: string): void {
  if (key) {
    spokenThisSession.delete(key)
  } else {
    spokenThisSession.clear()
  }
}

export function clearSpokenByPrefix(prefix: string): void {
  for (const key of spokenThisSession) {
    if (key.startsWith(prefix)) spokenThisSession.delete(key)
  }
}

function recordLatency(latency: number): void {
  if (latency < 0) return
  lastLatencyMs = latency
  latencySamples.push(latency)
  if (latencySamples.length > 30) latencySamples.shift()
}

export function speak(text: string): Promise<number> {
  return new Promise((resolve) => {
    if (!isSpeechSupported() || !text.trim()) {
      resolve(-1)
      return
    }
    const synth = window.speechSynthesis
    synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const enVoices = voicesCache.filter((v) => v.lang.toLowerCase().startsWith('en'))
    utterance.voice = enVoices[0] ?? null
    utterance.rate = 1.5
    utterance.pitch = 1
    utterance.volume = 1

    const start = performance.now()
    let resolved = false
    currentlySpeaking = true

    const done = (latency: number) => {
      if (resolved) return
      resolved = true
      currentlySpeaking = false
      recordLatency(latency)
      resolve(latency)
    }

    utterance.onstart = () => done(Math.round(performance.now() - start))
    utterance.onend = () => done(Math.round(performance.now() - start))
    utterance.onerror = () => done(-1)

    synth.speak(utterance)
  })
}

export function speakOnce(key: string, text: string): Promise<number> {
  if (spokenThisSession.has(key)) return Promise.resolve(-1)
  spokenThisSession.add(key)
  voiceAlertCount++
  return speak(text)
}

export function benchmarkLatency(volume = 0): Promise<number> {
  if (!isSpeechSupported()) return Promise.resolve(-1)
  const synth = window.speechSynthesis
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance('a')
  const enVoices = voicesCache.filter((v) => v.lang.toLowerCase().startsWith('en'))
  utterance.voice = enVoices[0] ?? null
  utterance.rate = 1.2
  utterance.volume = volume

  const start = performance.now()
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(-1), 5000)
    let resolved = false
    currentlySpeaking = true
    const done = (latency: number) => {
      if (resolved) return
      resolved = true
      currentlySpeaking = false
      clearTimeout(timer)
      recordLatency(latency)
      resolve(latency)
    }
    utterance.onstart = () => done(Math.round(performance.now() - start))
    utterance.onend = () => done(Math.round(performance.now() - start))
    utterance.onerror = () => done(-1)
    synth.speak(utterance)
  })
}
