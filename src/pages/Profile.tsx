import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useI18n } from '../lib/i18n'
import { useMandal, useSession } from '../lib/session'
import { api, useMembers } from '../lib/api'
import { initial } from '../lib/format'
import { Screen, BackHeader, MandalLogo, inputCls } from '../components/ui'
import { InviteCard } from '../components/InviteCard'
import { LangToggle } from '../components/LangToggle'
import { useToast } from '../components/Toast'
import { IconCamera, IconCheck, IconClose, IconLogout, IconPencil } from '../components/Icons'

export default function Profile() {
  const { t } = useI18n()
  const qc = useQueryClient()
  const toast = useToast()
  const { refreshMembership } = useSession()
  const { mandal, userId, isPresident } = useMandal()
  const members = useMembers(mandal.id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveName() {
    const v = draft.trim()
    if (!v || v === mandal.name) return setEditing(false)
    setBusy(true)
    try {
      await api.renameMandal(mandal.id, v)
      await refreshMembership()
      setEditing(false)
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function pickLogo(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    setBusy(true)
    toast.show({ text: t('uploading') })
    try {
      await api.setLogo(mandal.id, file)
      await refreshMembership()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(id: string, name: string) {
    if (!window.confirm(t('confirmRemoveMember', { name }))) return
    try {
      await api.removeMember(mandal.id, id)
      await qc.invalidateQueries({ queryKey: ['members', mandal.id] })
      toast.show({ text: t('memberRemoved', { name }) })
    } catch (e) {
      toast.error(e)
    }
  }

  const list = members.data ?? []

  return (
    <Screen>
      <BackHeader title={t('myMandal')} sub={t('myMandalSub')} to="/" />

      <div className="flex flex-1 flex-col gap-[18px] px-5 pb-8 pt-2">
        <section aria-label={t('mandalName')} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-3.5">
          <div className="flex items-center gap-3.5">
            {isPresident ? (
              <label htmlFor="pf-logo" className="pick relative flex-none cursor-pointer" aria-label={t('changeLogoAria')}>
                <MandalLogo url={mandal.logo_url} name={mandal.name} size={72} radius={18} />
                <span aria-hidden="true" className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-kumkum text-white">
                  <IconCamera size={14} />
                </span>
                <input id="pf-logo" type="file" accept="image/*" className="sr-only-input" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
            ) : (
              <MandalLogo url={mandal.logo_url} name={mandal.name} size={72} radius={18} />
            )}
            {editing ? (
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor="pf-mandal" className="text-[13px] font-semibold text-ink-3">{t('mandalName')}</label>
                <input id="pf-mandal" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className={inputCls + ' border-kumkum text-[17px] font-semibold'} />
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="text-lg font-bold leading-tight">{mandal.name}</div>
                <div className="text-[13px] text-ink-4">
                  {t('yearLabel', { year: mandal.year })}
                </div>
              </div>
            )}
          </div>

          {isPresident ? (
            editing ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditing(false)} className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-white text-[15px] font-bold text-ink-2">
                  <IconClose size={16} />
                  {t('cancel')}
                </button>
                <button type="button" disabled={busy} onClick={saveName} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-kumkum text-[15px] font-bold text-white">
                  <IconCheck size={18} />
                  {t('saveName')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <label htmlFor="pf-logo" className="pick flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-white text-[15px] font-bold text-kumkum">
                  <IconCamera size={18} />
                  {mandal.logo_url ? t('changePhoto') : t('addPhoto')}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(mandal.name)
                    setEditing(true)
                  }}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-white text-[15px] font-bold text-kumkum"
                >
                  <IconPencil size={18} />
                  {t('editName')}
                </button>
              </div>
            )
          ) : (
            <div className="text-[13px] text-ink-3">{t('onlyPresidentEdits')}</div>
          )}
        </section>

        {isPresident && <InviteCard mandal={mandal} />}

        <section aria-label={t('volunteers')} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-[17px] font-bold">{t('volunteers')}</h2>
            <span className="text-sm font-semibold text-ink-3">{t('people', { n: list.length })}</span>
          </div>
          <ul className="m-0 list-none rounded-2xl border border-line bg-white p-0">
            {list.map((m, i) => (
              <li key={m.user_id} className={`flex items-center gap-3 py-2.5 pl-3.5 pr-2 ${i < list.length - 1 ? 'border-b border-line-3' : ''}`}>
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-kumkum-tint text-base font-bold text-kumkum">{initial(m.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-base font-semibold">{m.name}</span>
                    {m.role === 'president' && <span className="rounded-full bg-haldi-tint px-2 py-px text-[11px] font-bold text-kumkum-dark">{t('rolePresident')}</span>}
                    {m.user_id === userId && <span className="text-xs text-ink-4">({t('meTag')})</span>}
                  </span>
                  <span className="block text-[13px] text-ink-4">+91 {m.phone}</span>
                </span>
                {isPresident && m.user_id !== userId && (
                  <button type="button" onClick={() => removeMember(m.user_id, m.name)} aria-label={t('removeMemberAria', { name: m.name })} className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-4">
                    <IconClose size={20} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-3.5 py-2.5">
          <span className="text-[15px] font-semibold">{t('language')}</span>
          <LangToggle />
        </div>

        <button type="button" onClick={() => supabase.auth.signOut()} className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-line-2 bg-white text-[15px] font-bold text-ink-2">
          <IconLogout size={18} />
          {t('logout')}
        </button>
      </div>
    </Screen>
  )
}
