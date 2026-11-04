import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useI18n, type DictKey } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { api, useLabels } from '../lib/api'
import { digits, toInt } from '../lib/format'
import { useSpeech } from '../lib/device'
import type { ExpenseCategory } from '../lib/types'
import { Screen, BackHeader, ActionBar, RecordedBy, FieldError, inputCls } from '../components/ui'
import { useToast } from '../components/Toast'
import { CATEGORIES } from '../components/categories'
import { IconCamera, IconCheck, IconDots, IconMic, IconPencil } from '../components/Icons'

type Pick = { cat: ExpenseCategory; saved?: string } | null

export default function Expense() {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { mandal, member, userId } = useMandal()
  const labels = useLabels(mandal.id).data ?? []
  const speech = useSpeech(lang)

  const [amountStr, setAmountStr] = useState('')
  const [pick, setPick] = useState<Pick>(null)
  const [otherText, setOtherText] = useState('')
  const [keep, setKeep] = useState(true)
  const [paidTo, setPaidTo] = useState('')
  const [bill, setBill] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ amount?: DictKey; cat?: DictKey; other?: DictKey }>({})
  const [busy, setBusy] = useState(false)

  const isCustom = pick?.cat === 'other' && !pick.saved
  const suggestions = t('suggestions').split('|')
  const tileOn = 'border-2 border-out bg-out-tint text-out-dark'
  const tileOff = 'border-[1.5px] border-line bg-white text-ink-2'

  async function save() {
    const amount = toInt(amountStr)
    const errs: typeof errors = {}
    if (amount <= 0) errs.amount = 'errAmount'
    if (!pick) errs.cat = 'chooseOne'
    if (isCustom && !otherText.trim()) errs.other = 'errOtherName'
    setErrors(errs)
    if (Object.keys(errs).length || !pick) return
    setBusy(true)
    try {
      await api.createExpense({
        mandalId: mandal.id,
        userId,
        amount,
        category: pick.cat,
        label: pick.cat === 'other' ? (pick.saved ?? otherText.trim()) : null,
        paidTo,
        bill,
        keepLabel: isCustom && keep,
      })
      qc.invalidateQueries({ queryKey: ['expenses', mandal.id] })
      qc.invalidateQueries({ queryKey: ['labels', mandal.id] })
      toast.show({ text: t('expenseSaved') })
      nav('/', { replace: true })
    } catch (e) {
      toast.error(e)
      setBusy(false)
    }
  }

  const tile = (key: string, selected: boolean, onClick: () => void, icon: ReactNode, label: string, sub?: string) => (
    <button
      key={key}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-[92px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 ${selected ? tileOn : tileOff}`}
    >
      {icon}
      <span className="max-w-full truncate text-[15px] font-bold leading-tight">{label}</span>
      {sub && <span className="text-xs font-medium leading-none">{sub}</span>}
    </button>
  )

  return (
    <Screen bg="bg-white">
      <BackHeader title={t('addExpense')} to="/" />

      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-4 pt-2">
        <div className="rounded-[20px] bg-out-tint px-3 pb-3 pt-[18px] text-center">
          <label htmlFor="ex-amount" className="block text-sm font-semibold text-out-dark">{t('howMuch')}</label>
          <div className="mx-auto mt-1 flex h-16 w-[230px] items-center justify-center gap-1.5 border-b-2 border-dashed border-out-line">
            <span className="text-[34px] font-bold text-out">₹</span>
            <input
              id="ex-amount"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={amountStr}
              onChange={(e) => setAmountStr(digits(e.target.value))}
              aria-invalid={Boolean(errors.amount)}
              className="w-[150px] min-w-0 bg-transparent text-center text-[44px] font-bold text-out outline-none"
            />
            <IconPencil size={20} className="text-out" />
          </div>
          <FieldError>{errors.amount && t(errors.amount)}</FieldError>
        </div>

        <div className="flex flex-col gap-2">
          <div className="text-[15px] font-semibold">
            {t('forWhat')} <span className="text-[13px] font-medium text-ink-4">{t('chooseOne')}</span>
          </div>
          <div role="group" aria-label={t('forWhat')} className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map((c) =>
              tile(
                c.key,
                pick?.cat === c.key && !pick.saved,
                () => setPick({ cat: c.key }),
                c.icon(28),
                c.key === 'other' && isCustom && otherText.trim() ? otherText.trim() : t(c.label),
                c.key === 'other' && isCustom && otherText.trim() ? t('cat_other') : undefined,
              ),
            )}
            {labels.map((l) => tile('saved-' + l, pick?.saved === l, () => setPick({ cat: 'other', saved: l }), <IconDots size={28} />, l, t('cat_other')))}
          </div>
          <FieldError>{errors.cat && t(errors.cat)}</FieldError>
        </div>

        {isCustom && (
          <section aria-label={t('nameExpense')} className="-mt-1 flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-out-line bg-out-tint p-3">
            <label htmlFor="ex-other" className="text-[15px] font-bold text-out-dark">{t('nameExpense')}</label>
            <div className="flex h-[52px] items-center gap-2 rounded-xl border-[1.5px] border-out bg-white py-0 pl-3 pr-1">
              <input
                id="ex-other"
                placeholder={speech.listening ? t('listening') : t('nameExpensePh')}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value.slice(0, 60))}
                className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none"
              />
              {speech.supported && (
                <button
                  type="button"
                  aria-label={t('speakName')}
                  onClick={() => speech.listen(setOtherText)}
                  className={`flex h-11 w-11 flex-none items-center justify-center rounded-[10px] ${speech.listening ? 'bg-kumkum text-white' : 'bg-kumkum-tint text-kumkum'}`}
                >
                  <IconMic size={20} />
                </button>
              )}
            </div>
            <FieldError>{errors.other && t(errors.other)}</FieldError>
            <div className="text-[13px] text-out-dark">{t('orTapOne')}</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={otherText.trim() === s}
                  onClick={() => setOtherText(s)}
                  className={`h-11 rounded-full px-3.5 text-[15px] font-semibold ${otherText.trim() === s ? 'border-2 border-out bg-out text-white' : 'border-[1.5px] border-[#E7C4BF] bg-white text-ink-2'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold text-ink-2">
              <input type="checkbox" checked={keep} onChange={() => setKeep(!keep)} className="m-0 h-[22px] w-[22px] accent-kumkum" />
              {t('keepTile')}
            </label>
          </section>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="ex-to" className="text-sm font-semibold">
            {t('paidTo')} <span className="text-xs font-medium text-ink-4">({t('optional')})</span>
          </label>
          <input id="ex-to" placeholder={t('paidToPh')} value={paidTo} onChange={(e) => setPaidTo(e.target.value)} className={inputCls} />
        </div>

        <label htmlFor="ex-bill" className="pick flex h-16 cursor-pointer items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-[#B8AAA0] bg-paper text-ink-2">
          <IconCamera size={26} />
          <span className="text-left">
            <span className="block text-base font-bold">{bill ? t('billAdded') : t('billPhoto')}</span>
            <span className="block text-[13px] text-ink-3">{bill ? bill.name : t('optional')}</span>
          </span>
          <input id="ex-bill" type="file" accept="image/*" capture="environment" className="sr-only-input" onChange={(e) => setBill(e.target.files?.[0] ?? null)} />
        </label>

        <RecordedBy name={member.name} ward={member.ward} />
      </div>

      <ActionBar>
        <button type="button" onClick={save} disabled={busy} className="flex h-[60px] w-full items-center justify-center gap-2.5 rounded-2xl bg-out text-[19px] font-bold text-white">
          <IconCheck size={22} />
          {busy ? t('saving') : t('saveExpense')}
        </button>
      </ActionBar>
    </Screen>
  )
}
