import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { useSession } from '../lib/session'
import { api } from '../lib/api'
import { Screen, FieldError, inputCls } from '../components/ui'
import { LangToggle } from '../components/LangToggle'
import { IconLogout, IconPlus, IconUsers } from '../components/Icons'

/** First run: create a new mandal (become president) or join one with a code. */
export default function Setup() {
  const { t } = useI18n()
  const nav = useNavigate()
  const { session, refreshMembership } = useSession()
  const meta = (session?.user.user_metadata ?? {}) as { name?: string; phone?: string }
  const [choice, setChoice] = useState<'create' | 'join'>('create')
  const [mandalName, setMandalName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const myName = meta.name ?? ''
    const myPhone = meta.phone ?? ''
    if (choice === 'create' && !mandalName.trim()) return setError(t('errName'))
    if (choice === 'join' && code.trim().length !== 6) return setError(t('errCode'))
    setBusy(true)
    try {
      if (choice === 'create') {
        await api.createMandal(mandalName.trim(), myName, myPhone)
        nav('/invite', { replace: true })
      } else {
        await api.joinMandal(code.trim(), myName, myPhone)
        nav('/', { replace: true })
      }
      await refreshMembership()
    } catch (err) {
      const msg = (err as { message?: string }).message ?? ''
      setError(/invalid code/i.test(msg) ? t('errCode') : navigator.onLine ? t('errorGeneric') : t('offline'))
      setBusy(false)
    }
  }

  const option = (key: 'create' | 'join', title: string, sub: string, icon: ReactNode) => (
    <button
      type="button"
      role="radio"
      aria-checked={choice === key}
      onClick={() => {
        setChoice(key)
        setError('')
      }}
      className={`flex min-h-[76px] items-center gap-3 rounded-2xl border-2 px-4 text-left ${
        choice === key ? 'border-kumkum bg-kumkum-tint' : 'border-line bg-white'
      }`}
    >
      <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${choice === key ? 'bg-kumkum text-white' : 'bg-bg-2 text-ink-2'}`}>{icon}</span>
      <span>
        <span className="block text-[17px] font-bold">{title}</span>
        <span className="block text-[13px] text-ink-3">{sub}</span>
      </span>
    </button>
  )

  return (
    <Screen bg="bg-white">
      <header className="flex items-start justify-between px-5 pt-7">
        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-haldi-tint text-[19px] font-bold text-kumkum">श्री</div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <button type="button" aria-label="Log out" onClick={() => supabase.auth.signOut()} className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-ink-2">
            <IconLogout size={18} />
          </button>
        </div>
      </header>
      <div className="px-5 pt-4">
        <h1 className="m-0 text-2xl font-bold leading-tight">
          {meta.name ? `${meta.name}, ` : ''}
          {t('setupTitle')}
        </h1>
        <div className="mt-0.5 text-sm text-ink-3">{t('setupSub')}</div>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 px-5 pt-5">
        <div role="radiogroup" className="flex flex-col gap-2.5">
          {option('create', t('createMandal'), t('createMandalSub'), <IconPlus size={22} />)}
          {option('join', t('joinMandal'), t('joinMandalSub'), <IconUsers size={22} />)}
        </div>

        {choice === 'create' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="s-mandal" className="text-[15px] font-semibold">{t('mandalName')}</label>
            <input id="s-mandal" placeholder={t('mandalNamePh')} value={mandalName} onChange={(e) => setMandalName(e.target.value)} className={inputCls + ' h-14 text-lg'} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="s-code" className="text-[15px] font-semibold">{t('joinCode')}</label>
            <input
              id="s-code"
              autoCapitalize="characters"
              autoComplete="off"
              placeholder={t('joinCodePh')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              className={inputCls + ' h-14 text-center text-2xl font-bold tracking-[0.3em]'}
            />
          </div>
        )}
        <FieldError>{error}</FieldError>

        <div className="flex-1" />
        <div className="pb-6">
          <button type="submit" disabled={busy} className="flex h-[60px] w-full items-center justify-center rounded-2xl bg-kumkum text-[19px] font-bold text-white">
            {busy ? t('loading') : t('start')}
          </button>
        </div>
      </form>
    </Screen>
  )
}
