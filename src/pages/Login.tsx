import { useState, type FormEvent } from 'react'
import { supabase, phoneToEmail, cleanPhone } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { Screen, Toran, FieldError, inputCls } from '../components/ui'
import { LangToggle } from '../components/LangToggle'

export default function Login() {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const p = cleanPhone(phone)
    if (mode === 'signup' && !name.trim()) return setError(t('errName'))
    if (p.length !== 10) return setError(t('errPhone'))
    if (!/^\d{6}$/.test(pin)) return setError(t('errPin'))
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(p), password: pin })
        if (error) setError(t('errLogin'))
      } else {
        const { error } = await supabase.auth.signUp({
          email: phoneToEmail(p),
          password: pin,
          options: { data: { name: name.trim(), phone: p } },
        })
        if (error) setError(/already/i.test(error.message) ? t('errExists') : t('errorGeneric'))
      }
    } catch {
      setError(navigator.onLine ? t('errorGeneric') : t('offline'))
    } finally {
      setBusy(false)
    }
  }

  const tab = (m: 'login' | 'signup', label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      onClick={() => {
        setMode(m)
        setError('')
      }}
      className={`h-11 rounded-[11px] text-base font-bold ${mode === m ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-ink-3'}`}
    >
      {label}
    </button>
  )

  return (
    <Screen bg="bg-white">
      <div className="overflow-hidden bg-kumkum px-5 pb-7 text-white">
        <Toran className="-mx-5 mb-5 w-[calc(100%+40px)]" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-haldi-tint text-xl font-bold text-kumkum">श्री</div>
          <div className="rounded-full bg-white/90">
            <LangToggle />
          </div>
        </div>
        <h1 className="mt-4 text-[26px] font-bold leading-tight">{t('loginTitle')}</h1>
        <p className="mt-1 text-[15px] text-haldi-tint">{t('appName')} · {t('loginSub')}</p>
      </div>

      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 px-5 pt-5" noValidate>
        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-[14px] bg-bg-2 p-1">
          {tab('login', t('tabLogin'))}
          {tab('signup', t('tabSignup'))}
        </div>

        {mode === 'signup' && (
          <div className="flex flex-col gap-1">
            <label htmlFor="l-name" className="text-[15px] font-semibold">{t('yourName')}</label>
            <input id="l-name" autoComplete="name" placeholder={t('yourNamePh')} value={name} onChange={(e) => setName(e.target.value)} className={inputCls + ' h-[52px] text-[17px]'} />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="l-phone" className="text-[15px] font-semibold">{t('mobile')}</label>
          <div className="flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] border-line-2 px-3 focus-within:border-kumkum">
            <span className="text-[17px] text-ink-3">+91</span>
            <input
              id="l-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 11))}
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="l-pin" className="text-[15px] font-semibold">{t('pin')}</label>
          <input
            id="l-pin"
            type="password"
            inputMode="numeric"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            maxLength={6}
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className={inputCls + ' h-[52px] text-center text-2xl tracking-[0.5em]'}
          />
          {mode === 'signup' && <div className="text-[13px] text-ink-3">{t('pinHintSignup')}</div>}
        </div>

        <FieldError>{error}</FieldError>

        <button type="submit" disabled={busy} className="mt-1 h-[60px] rounded-2xl bg-kumkum text-lg font-bold text-white">
          {busy ? t('loading') : mode === 'login' ? t('loginBtn') : t('signupBtn')}
        </button>
        {mode === 'login' && <p className="text-center text-[13px] text-ink-3">{t('forgotPin')}</p>}
      </form>
    </Screen>
  )
}
