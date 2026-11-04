import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { useDonations, useMembers } from '../lib/api'
import { dateTime, rs } from '../lib/format'
import { shareNodeAsImage, whatsappLink } from '../lib/device'
import { Screen, BackHeader, Spinner, Toran, MandalLogo, ActionBar } from '../components/ui'
import { useToast } from '../components/Toast'
import { IconChat, IconCircleCheck, IconClock, IconPrint, IconShare } from '../components/Icons'

/** The receipt exactly as the devotee receives it, with send / share / print. */
export default function Receipt() {
  const { id } = useParams()
  const { t, lang } = useI18n()
  const toast = useToast()
  const { mandal } = useMandal()
  const donations = useDonations(mandal.id)
  const members = useMembers(mandal.id)
  const card = useRef<HTMLElement>(null)
  const [sharing, setSharing] = useState(false)
  const d = donations.data?.find((x) => x.id === id)

  if (donations.isLoading) return <Screen><Spinner label={t('loading')} /></Screen>
  if (!d) return <Screen><BackHeader title={t('receipt')} /><div className="p-6 text-center text-ink-3">{t('notFound')}</div></Screen>

  const bal = d.total - d.paid
  const by = members.data?.find((m) => m.user_id === d.created_by)
  const president = members.data?.find((m) => m.role === 'president')
  const message = t('receiptMsg', {
    mandal: mandal.name,
    n: d.receipt_no,
    date: dateTime(d.created_at, lang),
    name: d.name,
    total: rs(d.total),
    paid: rs(d.paid),
    bal: rs(bal),
  })

  async function shareImage() {
    if (!card.current) return
    setSharing(true)
    try {
      const r = await shareNodeAsImage(card.current, `pavti-${d!.receipt_no}.png`, message)
      if (r === 'saved') toast.show({ text: t('imageDownloaded') })
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error(e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Screen bg="bg-bg-2">
      <BackHeader title={t('receipt')} sub={t('receiptSub')} />

      <div className="flex-1 px-5 pb-4 pt-2">
        <article ref={card} aria-label={`${t('varganiReceipt')} ${d.receipt_no}`} className="print-area overflow-hidden rounded-[18px] bg-white shadow-[0_1px_0_#D6CEC7]">
          <div className="bg-kumkum px-[18px] pb-4 text-white">
            <Toran className="-mx-[18px] mb-3 w-[calc(100%+36px)]" />
            <div className="flex items-center gap-3">
              <MandalLogo url={mandal.logo_url} name={mandal.name} />
              <div className="min-w-0">
                <div className="text-[19px] font-bold leading-tight">{mandal.name}</div>
                <div className="text-[13px] text-haldi-tint">
                  {t('yearLabel', { year: mandal.year })}
                </div>
              </div>
            </div>
          </div>

          {d.deleted_at && (
            <div className="bg-out-tint px-[18px] py-2 text-center text-sm font-bold text-out-dark">{t('cancelledReceipt')}</div>
          )}

          <div className="px-[18px] pt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="m-0 text-lg font-bold">{t('varganiReceipt')}</h2>
              <div className="text-[15px] font-bold text-kumkum">{t('receiptNoShort', { n: d.receipt_no })}</div>
            </div>
            <div className="mt-0.5 text-[13px] text-ink-3">{dateTime(d.created_at, lang)}</div>
            <dl className="m-0 mt-3.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
              <dt className="py-2 text-sm text-ink-3">{t('donorName')}</dt>
              <dd className="m-0 py-2 text-right text-base font-bold">{d.name}</dd>
              {d.house && (
                <>
                  <dt className="py-2 text-sm text-ink-3">{t('address')}</dt>
                  <dd className="m-0 py-2 text-right text-[15px] font-semibold">{d.house}</dd>
                </>
              )}
            </dl>
          </div>

          <div className="mx-[18px] mt-3 rounded-[14px] bg-bg p-3.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-3">{t('totalPromised')}</span>
              <span className="text-lg font-bold">{rs(d.total)}</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
              <span className="flex items-center gap-2 text-[15px] font-bold text-durva-dark">
                <IconCircleCheck size={18} />
                {t('received')}
              </span>
              <span className="text-[26px] font-bold text-durva">{rs(d.paid)}</span>
            </div>
            {bal > 0 && (
              <div className="mt-1.5 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[15px] font-bold text-due-dark">
                  <IconClock size={18} />
                  {t('due')}
                </span>
                <span className="text-lg font-bold text-due-text">{rs(bal)}</span>
              </div>
            )}
          </div>

          <div aria-hidden="true" className="relative mt-3.5 h-6">
            <span className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-bg-2" />
            <span className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-bg-2" />
            <span className="absolute inset-x-[18px] top-[11px] border-t-2 border-dashed border-line-2" />
          </div>

          <div className="px-[18px] pb-[18px] pt-1 text-center">
            <div className="text-xl font-bold text-kumkum">{t('thankYou')}</div>
            <div className="mt-1 text-sm text-ink-2">{t('thanksFrom', { mandal: mandal.name })}</div>
            <div className="mt-4 flex items-end justify-between text-left">
              <div className="text-xs text-ink-3">
                {t('collectedBy')}
                <br />
                <span className="text-sm font-bold text-ink">{by?.name ?? '—'}</span>
                {by?.ward ? `, ${t('ward', { w: by.ward })}` : ''}
              </div>
              {president && (
                <div className="text-right text-xs text-ink-3">
                  {t('contact')}
                  <br />
                  <span className="text-sm font-bold text-ink">+91 {president.phone}</span>
                </div>
              )}
            </div>
            <div className="mt-3.5 border-t border-line-3 pt-2.5 text-[11px] text-ink-4">{t('digitalReceipt')}</div>
          </div>
        </article>
      </div>

      <ActionBar className="flex flex-col gap-2.5">
        <button type="button" onClick={shareImage} disabled={sharing} className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-durva text-[17px] font-bold text-white disabled:opacity-60">
          <IconChat size={20} />
          {sharing ? t('loading') : t('sendWhatsapp')}
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <a href={whatsappLink(message, d.phone)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-2 bg-white text-[15px] font-semibold">
            <IconShare size={18} />
            {t('sendTextOnly')}
          </a>
          <button type="button" onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-line-2 bg-white text-[15px] font-semibold">
            <IconPrint size={18} />
            {t('print')}
          </button>
        </div>
      </ActionBar>
    </Screen>
  )
}
