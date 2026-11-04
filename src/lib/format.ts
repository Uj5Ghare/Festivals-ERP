import type { Lang } from './i18n'

/** ₹1,24,500 — Indian grouping, Latin digits (as in the design). */
export function rs(n: number): string {
  const v = Math.round(n)
  return (v < 0 ? '−₹' : '₹') + Math.abs(v).toLocaleString('en-IN')
}

/** Keeps digits only, max 7 (up to ₹99,99,999). */
export function digits(v: string, max = 7): string {
  return v.replace(/\D/g, '').slice(0, max)
}

export function toInt(v: string): number {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

function locale(lang: Lang) {
  return lang === 'mr' ? 'mr-IN-u-nu-latn' : 'en-IN'
}

export function dateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function dateOnly(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

export function shortDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), { day: 'numeric', month: 'short' }).format(new Date(iso))
}

/** "today 11:20" style label for the recently-deleted list. */
export function whenLabel(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const now = new Date()
  const time = new Intl.DateTimeFormat(locale(lang), { hour: 'numeric', minute: '2-digit' }).format(d)
  if (d.toDateString() === now.toDateString()) return (lang === 'mr' ? 'आज ' : 'Today ') + time
  return shortDate(iso, lang) + ', ' + time
}

export function initial(name: string): string {
  return Array.from(name.trim())[0] ?? '?'
}

/** Shrinks a photo before upload so it is quick on slow mobile data. */
export async function shrinkImage(file: File, maxSide: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image'))), 'image/jpeg', 0.85),
  )
}
