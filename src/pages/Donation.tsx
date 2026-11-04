import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useI18n, type DictKey } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { api, useDonations } from '../lib/api'
import { digits, initial, rs, toInt } from '../lib/format'
import { contactsSupported, loadSavedContacts, pickContacts, saveContacts, useSpeech, type PhoneContact } from '../lib/device'
import { cleanPhone } from '../lib/supabase'
import { Screen, BackHeader, ActionBar, RecordedBy, FieldError, inputCls } from '../components/ui'
import { useToast } from '../components/Toast'
import {
  IconAlert, IconCash, IconCheck, IconCircleCheck, IconClock, IconContact, IconHalf, IconInfo, IconMic, IconPencil,
} from '../components/Icons'

type Mode = 'full' | 'split' | 'pending'
const QUICK = [100, 200, 300, 500, 1000]

export default function Donation() {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { mandal, member } = useMandal()
  const pastDonations = useDonations(mandal.id).data

  const [amountStr, setAmountStr] = useState('')
  const [mode, setMode] = useState<Mode>('full')
  const [edited, setEdited] = useState<'paid' | 'bal'>('paid')
  const [paidStr, setPaidStr] = useState('')
  const [balStr, setBalStr] = useState('')
  const [name, setName] = useState('')
  const [house, setHouse] = useState('')
  const [phone, setPhone] = useState('')
  const [contacts, setContacts] = useState<PhoneContact[]>(loadSavedContacts)
  const [nameFocused, setNameFocused] = useState(false)
  const [errors, setErrors] = useState<{ amount?: DictKey; name?: DictKey }>({})
  const [busy, setBusy] = useState(false)
  const speech = useSpeech(lang)
  const canPick = contactsSupported()

  // ---- amounts: change either split box and the other follows the total
  const amount = toInt(amountStr)
  let paid: number
  let bal: number
  let overText = ''
  if (mode === 'full') {
    paid = amount
    bal = 0
  } else if (mode === 'pending') {
    paid = 0
    bal = amount
  } else if (edited === 'bal') {
    const raw = toInt(balStr)
    bal = Math.min(raw, amount)
    paid = amount - bal
    if (raw > amount) overText = t('overBal', { total: rs(amount) })
  } else {
    const raw = toInt(paidStr)
    paid = Math.min(raw, amount)
    bal = amount - paid
    if (raw > amount) overText = t('overPaid', { total: rs(amount) })
  }
  const paidShown = mode === 'split' && edited === 'paid' ? paidStr : String(paid)
  const balShown = mode === 'split' && edited === 'bal' ? balStr : String(bal)

  let summary: string
  if (amount === 0) summary = t('sumEnterAmount')
  else if (mode === 'full') summary = t('sumFull', { total: rs(amount) })
  else if (mode === 'pending') summary = t('sumPending', { total: rs(amount) })
  else summary = t('sumSplit', { total: rs(amount), paid: rs(paid), bal: rs(bal) })

  // ---- name suggestions: picked phone contacts + people who gave before
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase()
    if (!q) return []
    const seen = new Set<string>()
    const pool: { name: string; phone: string; house: string }[] = []
    for (const d of pastDonations ?? []) {
      if (d.deleted_at || seen.has(d.name)) continue
      seen.add(d.name)
      pool.push({ name: d.name, phone: d.phone ?? '', house: d.house ?? '' })
    }
    for (const c of contacts) {
      if (seen.has(c.name)) continue
      seen.add(c.name)
      pool.push({ name: c.name, phone: c.phone, house: '' })
    }
    return pool.filter((p) => p.name.toLowerCase().includes(q) && p.name !== name.trim()).slice(0, 4)
  }, [name, pastDonations, contacts])

  async function syncContacts() {
    try {
      const picked = await pickContacts(true)
      if (picked.length) setContacts(saveContacts(picked))
    } catch {
      /* user closed the picker */
    }
  }

  async function pickOne() {
    try {
      const [c] = await pickContacts(false)
      if (!c) return
      setPhone(c.phone)
      if (!name.trim()) setName(c.name)
      setContacts(saveContacts([c]))
    } catch {
      /* user closed the picker */
    }
  }

  async function save() {
    const errs: typeof errors = {}
    if (amount <= 0) errs.amount = 'errAmount'
    if (!name.trim()) errs.name = 'errName'
    setErrors(errs)
    if (errs.amount || errs.name || overText) return
    setBusy(true)
    try {
      const row = await api.createDonation({
        mandalId: mandal.id,
        name: name.trim(),
        house,
        phone: cleanPhone(phone),
        total: amount,
        paid,
      })
      await qc.invalidateQueries({ queryKey: ['donations', mandal.id] })
      qc.invalidateQueries({ queryKey: ['membership'] })
      nav(`/vargani/${row.id}/done`, { replace: true })
    } catch (e) {
      toast.error(e)
      setBusy(false)
    }
  }

  const modeBtn = (m: Mode, label: string, sub: string, icon: ReactNode, on: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`flex h-[76px] flex-col items-center justify-center gap-0.5 rounded-[14px] border-[1.5px] ${
        mode === m ? on : 'border-line bg-white text-ink-2'
      }`}
    >
      {icon}
      <span className="text-[15px] font-bold leading-tight">{label}</span>
      <span className="text-xs font-medium">{sub}</span>
    </button>
  )

  const saveLabel = mode === 'pending' ? t('savePending') : t('saveDonation')
  const saveSub = amount === 0 ? t('sumEnterAmount') : mode === 'pending' ? t('saveSubPending') : mode === 'split' ? t('sumSplit', { total: rs(amount), paid: rs(paid), bal: rs(bal) }) : t('saveSubFull')
  const savePill = mode === 'pending' ? t('pillDue', { amount: rs(bal) }) : t('pillPaid', { amount: rs(paid) })

  return (
    <Screen>
      <BackHeader title={t('addDonation')} sub={t('newVargani')} to="/" />

      <div className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-1">
        <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="h-2 w-2 rounded-full bg-durva" />
            {t('receiptNo', { n: '#' + (mandal.receipt_seq + 1) })}
          </div>
          <span className="max-w-[55%] truncate rounded-full bg-kumkum-tint px-2.5 py-1 text-[13px] font-bold text-kumkum-dark">{mandal.name}</span>
        </div>

        <section aria-label={t('totalAmount')} className="rounded-2xl border border-line bg-white p-3 text-center">
          <label htmlFor="dn-amount" className="block text-sm font-semibold text-ink-3">{t('totalAmount')}</label>
          <div className="mx-auto mt-1 flex h-16 w-[230px] items-center justify-center gap-1.5 border-b-2 border-dashed border-[#B8AAA0]">
            <span className="text-[34px] font-bold text-ink-3">₹</span>
            <input
              id="dn-amount"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(digits(e.target.value))}
              aria-invalid={Boolean(errors.amount)}
              className="w-[140px] min-w-0 bg-transparent text-center text-[40px] font-bold text-ink outline-none"
            />
            <IconPencil size={20} className="text-kumkum" />
          </div>
          <div className="mt-1.5 text-[13px] text-ink-3">{t('typeOrPick')}</div>
          <FieldError>{errors.amount && t(errors.amount)}</FieldError>
          <div role="group" aria-label={t('totalAmount')} className="mt-2 grid grid-cols-5 gap-1.5">
            {QUICK.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={amount === a}
                onClick={() => setAmountStr(String(a))}
                className={`h-12 rounded-[10px] text-sm font-bold ${amount === a ? 'border-2 border-ink bg-ink text-white' : 'border-[1.5px] border-line bg-bg text-ink'}`}
              >
                {rs(a)}
              </button>
            ))}
          </div>
        </section>

        <section aria-label={t('howPaid')} className="flex flex-col gap-1.5">
          <div className="text-[15px] font-semibold">{t('howPaid')}</div>
          <div className="grid grid-cols-3 gap-2">
            {modeBtn('full', t('fullPaid'), lang === 'mr' ? 'Full paid' : 'पूर्ण जमा', <IconCircleCheck size={22} />, 'border-durva bg-durva text-white')}
            {modeBtn('split', t('partPaid'), lang === 'mr' ? 'Part paid' : 'काही जमा', <IconHalf size={22} />, 'border-kumkum bg-kumkum text-white')}
            {modeBtn('pending', t('pending'), lang === 'mr' ? 'Pending' : 'पूर्ण बाकी', <IconClock size={22} />, 'border-due bg-due-tint text-due-dark')}
          </div>
        </section>

        {mode === 'split' && (
          <section aria-label={t('partPaid')} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-3">
            <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-durva-line bg-durva-tint px-2.5 py-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-durva text-white"><IconCash size={18} /></span>
              <label htmlFor="dn-paid" className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-durva-darker">{t('paidNow')}</span>
                <span className="block text-xs text-durva-dark">{t('paidNowSub')}</span>
              </label>
              <span className="flex h-12 w-[120px] items-center gap-1 rounded-[10px] border-[1.5px] border-durva bg-white px-2.5">
                <span className="text-lg font-bold text-durva">₹</span>
                <input
                  id="dn-paid"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={paidShown}
                  onChange={(e) => {
                    setEdited('paid')
                    setPaidStr(digits(e.target.value))
                  }}
                  className="w-full min-w-0 bg-transparent text-right text-xl font-bold text-durva outline-none"
                />
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl border-[1.5px] border-due-line bg-due-tint px-2.5 py-2">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-due text-white"><IconClock size={18} /></span>
              <label htmlFor="dn-bal" className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-due-dark">{t('balanceDue')}</span>
                <span className="block text-xs text-due-dark">{t('balanceDueSub')}</span>
              </label>
              <span className="flex h-12 w-[120px] items-center gap-1 rounded-[10px] border-[1.5px] border-due bg-white px-2.5">
                <span className="text-lg font-bold text-due-text">₹</span>
                <input
                  id="dn-bal"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="0"
                  value={balShown}
                  onChange={(e) => {
                    setEdited('bal')
                    setBalStr(digits(e.target.value))
                  }}
                  className="w-full min-w-0 bg-transparent text-right text-xl font-bold text-due-text outline-none"
                />
              </span>
            </div>
            <div className="text-center text-[13px] text-ink-3">{t('splitHint')}</div>
            {overText && (
              <div role="alert" className="flex items-center gap-2 rounded-[10px] bg-out-tint px-2.5 py-2 text-[13px] font-semibold text-out-dark">
                <IconAlert size={16} />
                {overText}
              </div>
            )}
          </section>
        )}

        <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">
          <IconInfo size={16} className="text-kumkum" />
          {summary}
        </div>

        {canPick && (
          contacts.length === 0 ? (
            <div className="flex items-center gap-2.5 rounded-[14px] border border-kumkum-line bg-kumkum-tint py-2.5 pl-3 pr-2.5">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white text-kumkum"><IconContact size={20} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-kumkum-dark">{t('syncTitle')}</span>
                <span className="block text-xs text-kumkum-dark">{t('syncSub')}</span>
              </span>
              <button type="button" onClick={syncContacts} className="h-11 flex-none rounded-[10px] bg-kumkum px-3.5 text-sm font-bold text-white">
                {t('syncBtn')}
              </button>
            </div>
          ) : (
            <div role="status" className="flex items-center gap-2 rounded-xl bg-durva-tint px-3 py-2 text-[13px] font-semibold text-durva-dark">
              <IconCheck size={16} />
              <span className="flex-1">{t('synced', { n: contacts.length })}</span>
              <button type="button" onClick={syncContacts} className="h-9 rounded-lg px-2 font-bold underline">{t('syncBtn')}</button>
            </div>
          )
        )}

        <section aria-label={t('name')} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-3">
          <div className="relative flex flex-col gap-1">
            <label htmlFor="dn-name" className="text-sm font-semibold">
              {t('name')} <span className="text-out">*</span>
            </label>
            <div className="flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] border-line-2 py-0 pl-3 pr-1 focus-within:border-kumkum">
              <input
                id="dn-name"
                autoComplete="off"
                placeholder={speech.listening ? t('listening') : t('namePh')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setTimeout(() => setNameFocused(false), 150)}
                aria-invalid={Boolean(errors.name)}
                aria-autocomplete="list"
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
              />
              {speech.supported && (
                <button
                  type="button"
                  aria-label={t('speakName')}
                  onClick={() => speech.listen((text) => setName(text))}
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-[10px] ${speech.listening ? 'bg-kumkum text-white' : 'bg-kumkum-tint text-kumkum'}`}
                >
                  <IconMic size={20} />
                </button>
              )}
            </div>
            <FieldError>{errors.name && t(errors.name)}</FieldError>
            {nameFocused && suggestions.length > 0 && (
              <ul role="listbox" className="absolute inset-x-0 top-[82px] z-20 m-0 list-none rounded-xl border border-line-2 bg-white p-1 shadow-[0_10px_24px_rgba(43,29,22,0.16)]">
                {suggestions.map((c) => (
                  <li key={c.name + c.phone} role="option" aria-selected="false">
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setName(c.name)
                        if (c.phone) setPhone(c.phone)
                        if (c.house && !house) setHouse(c.house)
                        setNameFocused(false)
                      }}
                      className="flex min-h-[52px] w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left"
                    >
                      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-kumkum-tint text-[15px] font-bold text-kumkum">{initial(c.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold text-ink">{c.name}</span>
                        <span className="block text-[13px] text-ink-3">{[c.phone && '+91 ' + c.phone, c.house].filter(Boolean).join(' · ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="dn-house" className="text-sm font-semibold">{t('house')}</label>
            <input id="dn-house" placeholder={t('housePh')} value={house} onChange={(e) => setHouse(e.target.value)} className={inputCls} />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="dn-phone" className="text-sm font-semibold">
              {t('whatsapp')} <span className="text-xs font-medium text-ink-4">({t('optional')})</span>
            </label>
            <div className="flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] border-line-2 py-0 pl-3 pr-1 focus-within:border-kumkum">
              <span className="text-base text-ink-3">+91</span>
              <input
                id="dn-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d +]/g, '').slice(0, 16))}
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
              />
              {canPick && (
                <button type="button" aria-label={t('pickContact')} onClick={pickOne} className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-kumkum-tint text-kumkum">
                  <IconContact size={20} />
                </button>
              )}
            </div>
            <div className="text-xs text-ink-3">{phone ? t('phoneHintFilled') : t('phoneHintEmpty')}</div>
          </div>
        </section>

        <RecordedBy name={member.name} ward={member.ward} />
      </div>

      <ActionBar>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className={`flex h-16 w-full items-center gap-3 rounded-2xl pl-4 pr-2.5 text-left text-white ${mode === 'pending' ? 'bg-due-text' : 'bg-durva'}`}
        >
          <IconCheck size={22} />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold leading-tight">{busy ? t('saving') : saveLabel}</span>
            <span className="block truncate text-[13px] font-medium">{saveSub}</span>
          </span>
          <span className="rounded-[10px] bg-white/20 px-2.5 py-1.5 text-[15px] font-bold">{savePill}</span>
        </button>
      </ActionBar>
    </Screen>
  )
}
