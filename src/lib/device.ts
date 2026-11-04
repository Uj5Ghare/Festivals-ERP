import { useCallback, useEffect, useRef, useState } from 'react'
import type { Lang } from './i18n'

// ---------------------------------------------------------------- voice input

type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

function getRecognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Speak a name instead of typing it (Chrome on Android supports Marathi). */
export function useSpeech(lang: Lang) {
  const [listening, setListening] = useState(false)
  const rec = useRef<Recognition | null>(null)
  const supported = typeof window !== 'undefined' && getRecognitionCtor() !== null

  const listen = useCallback(
    (onText: (text: string) => void) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) return
      rec.current?.stop()
      const r = new Ctor()
      r.lang = lang === 'mr' ? 'mr-IN' : 'en-IN'
      r.interimResults = false
      r.maxAlternatives = 1
      r.onresult = (e) => onText(e.results[0][0].transcript.trim())
      r.onend = () => setListening(false)
      r.onerror = () => setListening(false)
      rec.current = r
      setListening(true)
      r.start()
    },
    [lang],
  )

  useEffect(() => () => rec.current?.stop(), [])
  return { supported, listening, listen }
}

// ---------------------------------------------------------------- phone contacts

export interface PhoneContact {
  name: string
  phone: string
}

type ContactsApi = { select: (props: string[], opts: { multiple: boolean }) => Promise<{ name?: string[]; tel?: string[] }[]> }

function contactsApi(): ContactsApi | null {
  const n = navigator as unknown as { contacts?: ContactsApi }
  return 'ContactsManager' in window && n.contacts ? n.contacts : null
}

export const contactsSupported = () => typeof window !== 'undefined' && contactsApi() !== null

/** Opens the phone's own contact picker (Chrome on Android). */
export async function pickContacts(multiple: boolean): Promise<PhoneContact[]> {
  const api = contactsApi()
  if (!api) return []
  const picked = await api.select(['name', 'tel'], { multiple })
  return picked
    .map((c) => ({ name: (c.name?.[0] ?? '').trim(), phone: (c.tel?.[0] ?? '').replace(/\D/g, '').slice(-10) }))
    .filter((c) => c.name)
}

const KEY = 'savedContacts'

/** Contacts the volunteer chose to add are kept on this phone only. */
export function loadSavedContacts(): PhoneContact[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PhoneContact[]
  } catch {
    return []
  }
}

export function saveContacts(list: PhoneContact[]) {
  const merged = new Map(loadSavedContacts().map((c) => [c.name + c.phone, c]))
  for (const c of list) merged.set(c.name + c.phone, c)
  const all = [...merged.values()]
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* storage full or blocked: suggestions just won't persist */
  }
  return all
}

// ---------------------------------------------------------------- online status

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

// ---------------------------------------------------------------- sharing

export function whatsappLink(text: string, phone?: string | null) {
  const p = phone ? '91' + phone.replace(/\D/g, '').slice(-10) : ''
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`
}

/**
 * Shares the card (receipt / report) as a picture WITH the text message, in one
 * go, through the phone's share sheet (pick WhatsApp there). Where the browser
 * cannot share files (e.g. a computer) the picture is saved instead.
 */
export async function shareNodeAsImage(node: HTMLElement, fileName: string, text: string): Promise<'shared' | 'saved'> {
  const { toBlob } = await import('html-to-image')
  const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' })
  if (!blob) throw new Error('image')
  const file = new File([blob], fileName, { type: 'image/png' })
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  const data: ShareData = { files: [file], text }
  if (nav.share && nav.canShare?.(data)) {
    await nav.share(data)
    return 'shared'
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
  return 'saved'
}
