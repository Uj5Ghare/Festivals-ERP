import { useState, type FormEvent } from 'react'
import { supabase, phoneToEmail, cleanPhone } from '../lib/supabase'
import { useI18n, type DictKey } from '../lib/i18n'
import { Screen, Toran, FieldError, inputCls } from '../components/ui'
import { LangToggle } from '../components/LangToggle'

export default function Login() {
  const [forgot, setForgot] = useState<string | null>(null)
  if (forgot !== null) return <ForgotPin initialPhone={forgot} onBack={() => setForgot(null)} />
  return <LoginForm onForgot={setForgot} />
}

function LoginForm({ onForgot }: { onForgot: (phone: string) => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<DictKey | ''>('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const p = cleanPhone(phone)
    if (mode === 'signup' && !name.trim()) return setError('errName')
    if (p.length !== 10) return setError('errPhone')
    if (!/^\d{6}$/.test(pin)) return setError('errPin')
    setBusy(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(p), password: pin })
        if (error) {
          if (error.status === 429) setError('errRateLimit')
          else if (/not confirmed/i.test(error.message)) setError('errConfirmOn')
          else setError('errLogin')
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: phoneToEmail(p),
          password: pin,
          options: { data: { name: name.trim(), phone: p } },
        })
        if (error) {
          if (error.status === 429 || /rate limit/i.test(error.message)) setError('errRateLimit')
          else if (/already/i.test(error.message)) setError('errExists')
          else setError('errorGeneric')
        } else if (!data.session) {
          // Supabase created the user but is waiting for an email confirmation that will never arrive
          setError('errConfirmOn')
        }
      }
    } catch {
      setError(navigator.onLine ? 'errorGeneric' : 'offline')
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
          <img src="/pwa-192.png" alt="" className="h-14 w-14 rounded-2xl" />
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
              onChange={(e) => setPhone(e.target.value.replace(/[^\d +]/g, '').slice(0, 16))}
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

        <FieldError>{error && t(error)}</FieldError>

        <button type="submit" disabled={busy} className="mt-1 h-[60px] rounded-2xl bg-kumkum text-lg font-bold text-white">
          {busy ? t('loading') : mode === 'login' ? t('loginBtn') : t('signupBtn')}
        </button>
        {mode === 'login' && (
          <button type="button" onClick={() => onForgot(phone)} className="mb-6 h-11 text-center text-[15px] font-bold text-kumkum underline">
            {t('forgotPin')}
          </button>
        )}
      </form>
    </Screen>
  )
}

/** Forgot PIN: the president uses the recovery key; volunteers ask the president. */
function ForgotPin({ initialPhone, onBack }: { initialPhone: string; onBack: () => void }) {
  const { t } = useI18n()
  const [phone, setPhone] = useState(initialPhone)
  const [key, setKey] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<DictKey | ''>('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const p = cleanPhone(phone)
    if (p.length !== 10) return setError('errPhone')
    if (key.replace(/[^A-Za-z0-9]/g, '').length < 10) return setError('errKeyEmpty')
    if (!/^\d{6}$/.test(pin)) return setError('errPin')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('reset_pin_with_key', { p_phone: p, p_key: key, p_pin: pin })
      if (error) setError('errorGeneric')
      else if (data === 'ok') setDone(true)
      else setError(data === 'locked' ? 'errKeyLocked' : 'errKeyWrong')
    } catch {
      setError(navigator.onLine ? 'errorGeneric' : 'offline')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen bg="bg-white">
      <div className="overflow-hidden bg-kumkum px-5 pb-6 text-white">
        <Toran className="-mx-5 mb-5 w-[calc(100%+40px)]" />
        <h1 className="m-0 text-[24px] font-bold leading-tight">{t('forgotTitle')}</h1>
      </div>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4 px-5 pt-5" noValidate>
        {done ? (
          <>
            <div className="rounded-2xl border border-durva-line bg-durva-tint p-4 text-[16px] font-bold text-durva-dark">{t('pinChanged')}</div>
            <button type="button" onClick={onBack} className="h-[60px] rounded-2xl bg-kumkum text-lg font-bold text-white">{t('backToLogin')}</button>
          </>
        ) : (
          <>
            <p className="m-0 rounded-xl bg-bg-2 p-3 text-[14px] text-ink-2">{t('forgotVolunteer')}</p>
            <p className="m-0 text-[15px] font-semibold">{t('forgotPresident')}</p>
            <div className="flex flex-col gap-1">
              <label htmlFor="f-phone" className="text-[15px] font-semibold">{t('mobile')}</label>
              <div className="flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] border-line-2 px-3 focus-within:border-kumkum">
                <span className="text-[17px] text-ink-3">+91</span>
                <input id="f-phone" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d +]/g, '').slice(0, 16))} className="min-w-0 flex-1 bg-transparent text-[17px] outline-none" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="f-key" className="text-[15px] font-semibold">{t('recoveryKey')}</label>
              <input id="f-key" autoCapitalize="characters" autoComplete="off" placeholder="XXXXX-XXXXX" value={key} onChange={(e) => setKey(e.target.value.toUpperCase().slice(0, 14))} className={inputCls + ' h-[52px] text-center text-xl font-bold tracking-[0.15em]'} />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="f-pin" className="text-[15px] font-semibold">{t('newPin')}</label>
              <input id="f-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputCls + ' h-[52px] text-center text-2xl tracking-[0.5em]'} />
            </div>
            <FieldError>{error && t(error)}</FieldError>
            <button type="submit" disabled={busy} className="h-[60px] rounded-2xl bg-kumkum text-lg font-bold text-white">{busy ? t('loading') : t('resetPinBtn')}</button>
            <button type="button" onClick={onBack} className="mb-6 h-11 text-[15px] font-bold text-ink-2">{t('backToLogin')}</button>
          </>
        )}
      </form>
    </Screen>
  )
}
