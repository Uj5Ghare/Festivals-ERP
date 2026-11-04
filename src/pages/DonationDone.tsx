import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { useDonations, useMembers } from '../lib/api'
import { dateTime, rs } from '../lib/format'
import { Screen, Spinner, ActionBar } from '../components/ui'
import { IconChat, IconCheck, IconClock, IconPlus } from '../components/Icons'

export default function DonationDone() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const { mandal } = useMandal()
  const donations = useDonations(mandal.id)
  const members = useMembers(mandal.id)
  const d = donations.data?.find((x) => x.id === id)

  if (donations.isLoading) return <Screen><Spinner label={t('loading')} /></Screen>
  if (!d) return <Screen><div className="p-6 text-center text-ink-3">{t('notFound')}</div></Screen>

  const bal = d.total - d.paid
  const by = members.data?.find((m) => m.user_id === d.created_by)
  const title = d.paid > 0 ? t('doneTitle', { amount: rs(d.paid) }) : t('doneTitlePending', { amount: rs(d.total) })

  const row = (label: string, value: ReactNode, last = false) => (
    <>
      <dt className={`py-2.5 text-sm text-ink-3 ${last ? '' : 'border-b border-line-3'}`}>{label}</dt>
      <dd className={`m-0 py-2.5 text-right text-[15px] font-semibold ${last ? '' : 'border-b border-line-3'}`}>{value}</dd>
    </>
  )

  return (
    <Screen>
      <div className="flex flex-1 flex-col items-center px-5 pt-12">
        <div className={`flex h-24 w-24 items-center justify-center rounded-full text-white ${d.paid > 0 ? 'bg-durva shadow-[0_0_0_12px_#DCEFE0]' : 'bg-due shadow-[0_0_0_12px_#FDF1D6]'}`}>
          {d.paid > 0 ? <IconCheck size={48} strokeWidth={2.8} /> : <IconClock size={48} />}
        </div>
        <h1 className="mt-7 text-center text-[26px] font-bold leading-tight">{title}</h1>
        {bal > 0 && d.paid > 0 && (
          <div className="mt-0.5 text-[15px] font-semibold text-due-text">{t('doneSubSplit', { total: rs(d.total), bal: rs(bal) })}</div>
        )}

        <section aria-label={t('receipt')} className="mt-7 w-full rounded-[20px] border border-line bg-white px-[18px] pb-1.5 pt-[18px]">
          <div className="flex items-center justify-between border-b border-dashed border-line-2 pb-3">
            <div className="text-base font-bold">{t('receipt')}</div>
            <div className="text-sm font-semibold text-ink-3">#{d.receipt_no}</div>
          </div>
          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
            {row(t('name'), d.name)}
            {d.house && row(t('address'), d.house)}
            {d.phone && row(t('whatsapp'), '+91 ' + d.phone)}
            {row(
              t('status'),
              bal === 0 ? (
                <span className="rounded-full bg-durva-soft px-2.5 py-0.5 text-[13px] font-bold text-durva-dark">✓ {t('statusPaid')}</span>
              ) : (
                <span className="inline-flex flex-wrap justify-end gap-1">
                  <span className="rounded-full bg-kumkum-tint px-2.5 py-0.5 text-[13px] font-bold text-kumkum-dark">{d.paid > 0 ? t('statusPartial') : t('statusPending')}</span>
                  <span className="rounded-full bg-due-tint px-2.5 py-0.5 text-[13px] font-bold text-due-dark">{t('pillDue', { amount: rs(bal) })}</span>
                </span>
              ),
            )}
            {row(t('recordedBy'), <>{by?.name ?? ''} · <span className="text-[13px] font-normal text-ink-3">{dateTime(d.created_at, lang)}</span></>, true)}
          </dl>
        </section>

        <Link to={`/vargani/${d.id}/receipt`} className="mt-4 flex min-h-12 w-full items-center gap-2 rounded-xl bg-kumkum-tint px-3.5 text-[15px] font-bold text-kumkum-dark">
          <IconChat size={18} />
          <span className="flex-1">{t('viewReceipt')}</span>
          <span aria-hidden="true">›</span>
        </Link>
      </div>

      <ActionBar className="flex flex-col gap-2.5 border-t-0 bg-transparent">
        <Link to="/vargani/new" className="flex h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-durva text-lg font-bold text-white">
          <IconPlus size={22} />
          {t('nextDonation')}
        </Link>
        <Link to="/" className="flex h-14 items-center justify-center rounded-2xl border-[1.5px] border-line-2 bg-white text-[17px] font-semibold text-ink">
          {t('goHome')}
        </Link>
      </ActionBar>
    </Screen>
  )
}
