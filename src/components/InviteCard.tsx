import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { whatsappLink } from '../lib/device'
import type { Mandal } from '../lib/types'
import { IconChat, IconCopy } from './Icons'

/** The mandal's 6-character join code, with copy and WhatsApp share. */
export function InviteCard({ mandal }: { mandal: Mandal }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const message = t('inviteMessage', { mandal: mandal.name, code: mandal.join_code, url: window.location.origin })

  async function copy() {
    try {
      await navigator.clipboard.writeText(mandal.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the code is visible on screen anyway */
    }
  }

  return (
    <section aria-label={t('inviteTitle')} className="flex flex-col gap-2.5 rounded-2xl border border-kumkum-line bg-kumkum-tint p-3.5">
      <h2 className="m-0 text-base font-bold text-kumkum-dark">{t('inviteTitle')}</h2>
      <p className="m-0 text-[13px] text-kumkum-dark">{t('inviteSub')}</p>
      <div className="flex items-center gap-2">
        <div className="flex h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] border-dashed border-kumkum bg-white text-[28px] font-bold tracking-[0.3em] text-kumkum">
          {mandal.join_code}
        </div>
        <button type="button" onClick={copy} className="flex h-14 min-w-[76px] flex-col items-center justify-center rounded-xl border-[1.5px] border-line-2 bg-white px-2 text-xs font-bold text-ink-2">
          <IconCopy size={18} />
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <a href={whatsappLink(message)} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-durva text-base font-bold text-white">
        <IconChat size={20} />
        {t('shareInvite')}
      </a>
    </section>
  )
}
