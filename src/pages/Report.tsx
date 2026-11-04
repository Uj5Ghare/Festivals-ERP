import { useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { totals, useDonations, useExpenses, useMembers } from '../lib/api'
import { dateOnly, rs } from '../lib/format'
import { shareNodeAsImage, whatsappLink } from '../lib/device'
import type { ExpenseCategory } from '../lib/types'
import { Screen, BackHeader, Spinner, Toran, MandalLogo, ActionBar } from '../components/ui'
import { useToast } from '../components/Toast'
import { IconChat, IconDownload, IconLock, IconShare } from '../components/Icons'

/** One-page jama-kharch for the society WhatsApp group. Totals only — no devotee names. */
export default function Report() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const { mandal } = useMandal()
  const donations = useDonations(mandal.id)
  const expenses = useExpenses(mandal.id)
  const members = useMembers(mandal.id)
  const card = useRef<HTMLElement>(null)
  const [sharing, setSharing] = useState(false)

  if (donations.isLoading || expenses.isLoading) return <Screen><Spinner label={t('loading')} /></Screen>

  const s = totals(donations.data, expenses.data)
  const cancelled = (donations.data ?? []).filter((d) => d.deleted_at).map((d) => d.receipt_no).sort((a, b) => a - b)
  const president = members.data?.find((m) => m.role === 'president')

  // Spending by category; custom "Other" names are grouped under their own label
  const byCat = new Map<string, number>()
  for (const e of expenses.data ?? []) {
    if (e.deleted_at) continue
    const label = e.category === 'other' ? (e.label ? `${t('cat_other')} (${e.label})` : t('cat_other')) : t(`cat_${e.category as Exclude<ExpenseCategory, 'other'>}`)
    byCat.set(label, (byCat.get(label) ?? 0) + e.amount)
  }
  const rows = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  const max = rows[0]?.[1] ?? 1

  const message = t('reportMsg', {
    mandal: mandal.name,
    year: mandal.year,
    in: rs(s.paidIn),
    out: rs(s.out),
    bal: rs(s.balance),
    due: rs(s.due),
  })

  async function shareImage() {
    if (!card.current) return
    setSharing(true)
    try {
      await shareNodeAsImage(card.current, `hisaab-${mandal.year}.png`, message)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(e)
    } finally {
      setSharing(false)
    }
  }

  const line = (label: string, value: string, strong = false) => (
    <div className="flex justify-between py-1 text-sm">
      <span>{label}</span>
      <span className={`font-bold ${strong ? 'text-due-text' : ''}`}>{value}</span>
    </div>
  )

  return (
    <Screen bg="bg-bg-2">
      <BackHeader title={t('publicReport')} sub={t('reportSub')} to="/hisaab" />

      <div className="flex-1 px-5 pb-4 pt-2">
        <article ref={card} aria-label={t('publicReport')} className="print-area overflow-hidden rounded-[18px] bg-white shadow-[0_1px_0_#D6CEC7]">
          <div className="bg-kumkum px-[18px] pb-4 text-white">
            <Toran className="-mx-[18px] mb-3 w-[calc(100%+36px)]" />
            <div className="flex items-center gap-3">
              <MandalLogo url={mandal.logo_url} name={mandal.name} />
              <div>
                <div className="text-[19px] font-bold leading-tight">{mandal.name}</div>
                <div className="text-sm text-haldi-tint">{t('reportHeading', { year: mandal.year })}</div>
              </div>
            </div>
          </div>

          <section className="px-[18px] pb-1 pt-4">
            <div className="flex items-baseline justify-between py-2">
              <span className="text-base font-semibold">{t('totalCollected')}</span>
              <span className="text-[22px] font-bold text-durva">{rs(s.paidIn)}</span>
            </div>
            <div className="flex items-baseline justify-between py-2">
              <span className="text-base font-semibold">{t('totalOut')}</span>
              <span className="text-[22px] font-bold text-out">− {rs(s.out)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between rounded-xl bg-kumkum-tint px-3.5 py-3">
              <span className="text-[17px] font-bold text-kumkum-dark">{t('balance')}</span>
              <span className="text-[28px] font-bold text-kumkum">{rs(s.balance)}</span>
            </div>
          </section>

          {rows.length > 0 && (
            <section className="px-[18px] pt-4">
              <h2 className="m-0 mb-2.5 text-base font-bold">{t('spentOn')}</h2>
              <div className="flex flex-col gap-3">
                {rows.map(([label, amount]) => (
                  <div key={label}>
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{label}</span>
                      <span className="font-bold">{rs(amount)}</span>
                    </div>
                    <div aria-hidden="true" className="mt-1 h-2.5 rounded-full bg-line-3">
                      <div className="h-2.5 rounded-full bg-kumkum" style={{ width: `${Math.max(3, Math.round((amount / max) * 100))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-ink-3">{t('billsAvailable')}</div>
            </section>
          )}

          <section className="mx-[18px] mt-4 rounded-xl bg-bg px-3.5 py-3">
            <h2 className="m-0 mb-1.5 text-base font-bold">{t('collectionDetails')}</h2>
            {line(t('housesGave'), String(s.houses))}
            {line(t('statusPaid'), t('houses', { n: s.paidHouses }))}
            {line(t('stillDue'), `${t('houses', { n: s.dueHouses })} · ${rs(s.due)}`, s.due > 0)}
            {line(t('cancelledReceipts'), cancelled.length ? `${cancelled.length} (#${cancelled.join(', #')})` : t('none'))}
            {line(t('volunteersCount'), String(members.data?.length ?? 0))}
          </section>

          <div className="px-[18px] pb-[18px] pt-4">
            {president && (
              <div className="border-t border-line-2 pt-2">
                <div className="text-sm font-bold">{president.name}</div>
                <div className="text-xs text-ink-3">{t('rolePresident')} · +91 {president.phone}</div>
              </div>
            )}
            <div className="mt-3.5 text-xs text-ink-4">{t('preparedOn', { date: dateOnly(new Date().toISOString(), lang) })}</div>
          </div>
        </article>
      </div>

      <ActionBar className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-[13px] text-ink-3">
          <IconLock size={16} />
          {t('privacyNote')}
        </div>
        <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-durva text-[17px] font-bold text-white">
          <IconChat size={20} />
          {t('shareGroup')}
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={shareImage} disabled={sharing} className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-2 bg-white text-[15px] font-semibold">
            <IconShare size={18} />
            {t('shareImage')}
          </button>
          <button type="button" onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-2 bg-white text-[15px] font-semibold">
            <IconDownload size={18} />
            {t('downloadPdf')}
          </button>
        </div>
      </ActionBar>
    </Screen>
  )
}
