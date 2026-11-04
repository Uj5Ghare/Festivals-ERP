import { useId, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { initial } from '../lib/format'
import { IconBack, IconHome, IconList } from './Icons'

/** Phone-width column, centred on larger screens. */
export function Screen({ children, bg = 'bg-bg', className = '' }: { children: ReactNode; bg?: string; className?: string }) {
  return (
    <div className={`relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col ${bg} text-ink ${className}`}>
      {children}
    </div>
  )
}

/** The marigold-and-mango-leaf toran used on the balance card, receipt and report. */
export function Toran({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg width="100%" height="22" aria-hidden="true" focusable="false" className={`block ${className}`}>
      <defs>
        <pattern id={`toran-${id}`} width="30" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 1.5 Q15 6 30 1.5" fill="none" stroke="#E8A317" strokeWidth="1.5" />
          <circle cx="8" cy="10" r="6" fill="#E8A317" />
          <circle cx="8" cy="10" r="2.4" fill="#C47A06" />
          <path d="M20 3 C25 7 25 15 21.5 20 C18 15 17 8 20 3 Z" fill="#3E9B57" />
          <path d="M20.5 5 L21.5 18" stroke="#2C7A42" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="22" fill={`url(#toran-${id})`} />
    </svg>
  )
}

export function MandalLogo({ url, name, size = 52, radius = 14 }: { url: string | null; name: string; size?: number; radius?: number }) {
  const style = { width: size, height: size, borderRadius: radius }
  if (url) return <img src={url} alt="" style={style} className="block flex-none object-cover" />
  return (
    <div style={{ ...style, fontSize: Math.round(size * 0.35) }} className="flex flex-none items-center justify-center bg-haldi-tint font-bold text-kumkum">
      {initial(name)}
    </div>
  )
}

export function BackHeader({ title, sub, to }: { title: string; sub?: string; to?: string }) {
  const { t } = useI18n()
  const nav = useNavigate()
  return (
    <header className="flex items-center gap-2 px-3 pb-1 pt-4">
      <button
        type="button"
        aria-label={t('back')}
        onClick={() => (to ? nav(to) : nav(-1))}
        className="flex h-12 w-12 items-center justify-center rounded-full text-ink"
      >
        <IconBack size={24} />
      </button>
      <div>
        <h1 className="m-0 text-xl font-bold leading-tight">{title}</h1>
        {sub && <div className="text-[13px] text-ink-4">{sub}</div>}
      </div>
    </header>
  )
}

export function BottomNav({ active }: { active: 'home' | 'records' }) {
  const { t } = useI18n()
  const item = (key: 'home' | 'records', to: string, label: string, icon: ReactNode) => {
    const on = active === key
    return (
      <Link
        to={to}
        aria-current={on ? 'page' : undefined}
        className={`flex flex-col items-center gap-1 p-1.5 ${on ? 'text-kumkum' : 'text-ink-3'}`}
      >
        <span className={`flex h-8 w-16 items-center justify-center rounded-full ${on ? 'bg-kumkum-tint' : ''}`}>{icon}</span>
        <span className={`text-sm ${on ? 'font-bold' : 'font-semibold'}`}>{label}</span>
      </Link>
    )
  }
  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 grid grid-cols-2 border-t border-line bg-white px-8 pt-2"
      style={{ paddingBottom: 'max(22px, env(safe-area-inset-bottom))' }}
    >
      {item('home', '/', t('navHome'), <IconHome size={22} />)}
      {item('records', '/hisaab', t('navRecords'), <IconList size={22} />)}
    </nav>
  )
}

/** Fixed bottom action bar (Save buttons). */
export function ActionBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`sticky bottom-0 z-10 border-t border-line bg-white px-5 pt-2.5 ${className}`}
      style={{ paddingBottom: 'max(22px, env(safe-area-inset-bottom))' }}
    >
      {children}
    </div>
  )
}

export function RecordedBy({ name, ward }: { name: string; ward: string | null }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-bg-3 px-2.5 py-1.5">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-kumkum-tint text-sm font-bold text-kumkum">
        {initial(name)}
      </span>
      <span className="min-w-0 flex-1 text-[13px] text-ink-3">
        {t('recordedBy')} · <span className="font-bold text-ink">{name}</span>
      </span>
      {ward && (
        <span className="rounded-full bg-durva-soft px-2.5 py-0.5 text-xs font-bold text-durva-dark">{t('ward', { w: ward })}</span>
      )}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-ink-3">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line-2 border-t-kumkum" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div role="alert" className="mt-1 text-[13px] font-semibold text-out-dark">
      {children}
    </div>
  )
}

export const inputCls =
  'h-12 w-full rounded-xl border-[1.5px] border-line-2 bg-white px-3 text-base text-ink outline-none focus:border-kumkum'
