import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { api, totals, useDonations, useExpenses, useMembers } from '../lib/api'
import { initial, rs, shortDate, whenLabel } from '../lib/format'
import type { Donation, EntryKind, Expense, Member } from '../lib/types'
import { Screen, BottomNav, Spinner } from '../components/ui'
import { useToast } from '../components/Toast'
import { categoryIcon } from '../components/categories'
import {
  IconAlert, IconChart, IconChat, IconCheck, IconChevron, IconClock, IconPlus, IconRestore, IconSearch, IconTrash,
} from '../components/Icons'

const DAY = 24 * 60 * 60 * 1000

export default function Records() {
  const { t, lang } = useI18n()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { mandal, member, userId, isPresident } = useMandal()
  const [params, setParams] = useSearchParams()
  const view = params.get('tab') === 'kharch' ? 'kharch' : 'vargani'
  const [filter, setFilter] = useState<'all' | 'paid' | 'due'>('all')
  const [search, setSearch] = useState('')
  const [binOpen, setBinOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const donations = useDonations(mandal.id)
  const expenses = useExpenses(mandal.id)
  const members = useMembers(mandal.id)
  const s = totals(donations.data, expenses.data)
  const nameOf = useMemo(() => {
    const m = new Map<string, Member>((members.data ?? []).map((x) => [x.user_id, x]))
    return (id: string | null) => (id ? (m.get(id)?.name ?? '—') : '')
  }, [members.data])

  const liveD = (donations.data ?? []).filter((d) => !d.deleted_at)
  const liveE = (expenses.data ?? []).filter((e) => !e.deleted_at)
  const recent = (iso: string | null) => iso !== null && Date.now() - new Date(iso).getTime() < 30 * DAY
  const binD = (donations.data ?? []).filter((d) => recent(d.deleted_at))
  const binE = (expenses.data ?? []).filter((e) => recent(e.deleted_at))
  const requestCount = liveD.filter((d) => d.delete_requested_by).length + liveE.filter((e) => e.delete_requested_by).length

  const q = search.trim().toLowerCase()
  const shownD = liveD.filter((d) => {
    if (filter === 'paid' && d.paid < d.total) return false
    if (filter === 'due' && d.paid >= d.total) return false
    if (!q) return true
    return d.name.toLowerCase().includes(q) || String(d.receipt_no) === q.replace('#', '') || (d.house ?? '').toLowerCase().includes(q)
  })

  function refresh(kind: EntryKind) {
    return qc.invalidateQueries({ queryKey: [kind === 'donation' ? 'donations' : 'expenses', mandal.id] })
  }

  async function run(id: string, kind: EntryKind, fn: () => Promise<unknown>, after?: () => void) {
    setBusyId(id)
    try {
      await fn()
      await refresh(kind)
      after?.()
    } catch (e) {
      toast.error(e)
    } finally {
      setBusyId(null)
    }
  }

  const actions = (kind: EntryKind, id: string, label: string) => ({
    remove: () =>
      run(id, kind, () => api.softDelete(kind, id), () =>
        toast.show({
          text: t('deletedToast', { name: label }),
          actionLabel: t('undo'),
          onAction: () => run(id, kind, () => api.restore(kind, id)),
        }),
      ),
    request: () => run(id, kind, () => api.requestDelete(kind, id), () => toast.show({ text: t('requestSent') })),
    clear: () => run(id, kind, () => api.clearRequest(kind, id)),
    restore: () => run(id, kind, () => api.restore(kind, id), () => toast.show({ text: t('restored', { name: label }) })),
  })

  const loading = donations.isLoading || expenses.isLoading

  return (
    <Screen>
      <header className="flex items-center justify-between px-5 pb-1.5 pt-5">
        <h1 className="m-0 text-[22px] font-bold leading-tight">{t('recordsTitle')}</h1>
        <Link to="/report" className="flex h-11 items-center gap-2 rounded-full border border-line-2 bg-white px-3.5 text-[15px] font-bold text-kumkum">
          <IconChart size={18} />
          {t('publicReport')}
        </Link>
      </header>

      <div className="mx-5 mt-1 inline-flex items-center gap-2 self-start rounded-full border border-line bg-white py-1.5 pl-1.5 pr-3 text-[13px]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-kumkum-tint text-sm font-bold text-kumkum">{initial(member.name)}</span>
        <span>
          {t('you')}: <span className="font-bold">{member.name}</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isPresident ? 'bg-haldi-tint text-kumkum-dark' : 'bg-bg-2 text-ink-2'}`}>
          {isPresident ? t('rolePresident') : t('roleVolunteer')}
        </span>
      </div>

      <div role="tablist" aria-label={t('recordsTitle')} className="mx-5 mt-2 grid grid-cols-2 gap-1 rounded-[14px] bg-bg-2 p-1">
        {(['vargani', 'kharch'] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => setParams(v === 'kharch' ? { tab: 'kharch' } : {}, { replace: true })}
            className={`h-11 rounded-[11px] text-base font-bold ${view === v ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]' : 'text-ink-3'}`}
          >
            {v === 'vargani' ? t('tabIn') : t('tabOut')}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pb-6">
        {isPresident && requestCount > 0 && (
          <div role="status" className="mt-3 flex items-center gap-2.5 rounded-xl border border-out-line bg-out-tint px-3 py-2.5 text-sm font-bold text-out-dark">
            <IconAlert size={18} />
            {t('requestsBanner', { n: requestCount })}
          </div>
        )}

        {loading ? (
          <Spinner label={t('loading')} />
        ) : view === 'vargani' ? (
          <>
            <section aria-label={t('totalVargani')} className="mt-3 rounded-2xl border border-line bg-white p-3.5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-ink-3">{t('totalVargani')}</div>
                <span className="rounded-full bg-kumkum-tint px-2.5 py-0.5 text-xs font-bold text-kumkum-dark">{t('houses', { n: s.houses })}</span>
              </div>
              <div className="text-[30px] font-bold tracking-[-0.01em]">{rs(s.promised)}</div>
              <div className="mt-2 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-durva-tint px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-durva-dark">{t('moneyIn')}</div>
                  <div className="text-[19px] font-bold text-durva">{rs(s.paidIn)}</div>
                  <div className="text-xs text-durva-dark">{t('houses', { n: s.paidHouses })}</div>
                </div>
                <div className="rounded-xl bg-due-tint px-3 py-2.5">
                  <div className="text-[13px] font-semibold text-due-dark">{t('filterDue')}</div>
                  <div className="text-[19px] font-bold text-due-text">{rs(s.due)}</div>
                  <div className="text-xs text-due-dark">{t('housesDue', { n: s.dueHouses })}</div>
                </div>
              </div>
            </section>

            <div role="group" aria-label={t('filterAll')} className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  ['all', t('filterAll')],
                  ['paid', t('filterPaid')],
                  ['due', t('filterDue')],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                  className={`h-11 rounded-full text-sm font-bold ${filter === k ? 'bg-ink text-white' : 'border border-line-2 bg-white text-ink-2'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex h-12 items-center gap-2.5 rounded-xl border border-line-2 bg-white px-3.5">
              <IconSearch size={20} className="text-ink-3" />
              <label htmlFor="rc-search" className="sr-only-input">{t('searchPh')}</label>
              <input id="rc-search" type="search" placeholder={t('searchPh')} value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 bg-transparent text-base outline-none" />
            </div>

            {liveD.length === 0 ? (
              <Empty text={t('noDonations')} to="/vargani/new" cta={t('addDonation')} />
            ) : shownD.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-3">{t('noMatch')}</div>
            ) : (
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {shownD.map((d) => (
                  <DonationCard
                    key={d.id}
                    d={d}
                    busy={busyId === d.id}
                    isPresident={isPresident}
                    userId={userId}
                    requester={nameOf(d.delete_requested_by)}
                    onCollect={() => run(d.id, 'donation', () => api.markPaid(d.id), () => toast.show({ text: t('markedPaid', { name: d.name }) }))}
                    onResend={() => nav(`/vargani/${d.id}/receipt`)}
                    {...actions('donation', d.id, d.name)}
                  />
                ))}
              </ul>
            )}

            <Bin
              open={binOpen}
              onToggle={() => setBinOpen(!binOpen)}
              items={binD.map((d) => ({
                id: d.id,
                title: d.name,
                sub: `${t('receiptShort', { n: d.receipt_no })} · ${rs(d.total)}${d.paid < d.total ? ` (${t('pillDue', { amount: rs(d.total - d.paid) })})` : ''}`,
                meta: deletedMeta(d),
                initial: initial(d.name),
                restore: isPresident ? actions('donation', d.id, d.name).restore : undefined,
              }))}
            />
          </>
        ) : (
          <>
            <section aria-label={t('totalOut')} className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-white p-3.5">
              <div>
                <div className="text-sm text-ink-3">{t('totalOut')}</div>
                <div className="text-[30px] font-bold tracking-[-0.01em] text-out">{rs(s.out)}</div>
              </div>
              <div className="text-right text-[13px] text-ink-3">{t('entries', { n: liveE.length })}</div>
            </section>

            <Link to="/kharch/new" className="mt-3 flex h-[52px] items-center justify-center gap-2 rounded-[14px] bg-out text-[17px] font-bold text-white">
              <IconPlus size={20} />
              {t('addNewExpense')}
            </Link>

            {liveE.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-3">{t('noExpenses')}</div>
            ) : (
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {liveE.map((e) => (
                  <ExpenseCard
                    key={e.id}
                    e={e}
                    busy={busyId === e.id}
                    isPresident={isPresident}
                    userId={userId}
                    requester={nameOf(e.delete_requested_by)}
                    sub={[e.paid_to, shortDate(e.created_at, lang), nameOf(e.created_by)].filter(Boolean).join(' · ')}
                    title={e.category === 'other' && e.label ? e.label : t(`cat_${e.category}`)}
                    {...actions('expense', e.id, e.category === 'other' && e.label ? e.label : t(`cat_${e.category}`))}
                  />
                ))}
              </ul>
            )}

            <Bin
              open={binOpen}
              onToggle={() => setBinOpen(!binOpen)}
              items={binE.map((e) => {
                const title = e.category === 'other' && e.label ? e.label : t(`cat_${e.category}`)
                return {
                  id: e.id,
                  title,
                  sub: rs(e.amount),
                  meta: deletedMeta(e),
                  initial: initial(title),
                  restore: isPresident ? actions('expense', e.id, title).restore : undefined,
                }
              })}
            />
          </>
        )}
      </div>

      <BottomNav active="records" />
    </Screen>
  )

  function deletedMeta(x: Donation | Expense) {
    const by = nameOf(x.deleted_by)
    const asked = x.delete_requested_by && x.delete_requested_by !== x.deleted_by ? ` (${t('askedByShort', { name: nameOf(x.delete_requested_by) })})` : ''
    return t('deletedOn', { when: whenLabel(x.deleted_at!, lang), by: by + asked })
  }
}

// ------------------------------------------------------------------ pieces

interface EntryActions {
  remove: () => void
  request: () => void
  clear: () => void
}

function RequestStrip({ by, mine, isPresident, onKeep, onRemove, onCancel, busy }: {
  by: string; mine: boolean; isPresident: boolean; onKeep: () => void; onRemove: () => void; onCancel: () => void; busy: boolean
}) {
  const { t } = useI18n()
  return (
    <div className="mr-1.5 mt-2 rounded-xl border border-out-line bg-out-tint px-3 py-2.5">
      <div className="flex items-center gap-2 text-sm font-bold text-out-dark">
        <IconClock size={16} />
        {t('deleteRequest')}
      </div>
      <div className="mt-0.5 text-[13px] text-[#6B1A12]">
        {mine && !isPresident ? t('requestedByYou') : isPresident ? t('requestedBy', { name: by }) : t('waitingPresident', { name: by })}
      </div>
      {isPresident && (
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onKeep} className="h-11 rounded-[10px] border-[1.5px] border-line-2 bg-white text-[15px] font-bold">{t('keep')}</button>
          <button type="button" disabled={busy} onClick={onRemove} className="h-11 rounded-[10px] bg-out text-[15px] font-bold text-white">{t('remove')}</button>
        </div>
      )}
      {mine && !isPresident && (
        <button type="button" disabled={busy} onClick={onCancel} className="mt-2.5 h-11 rounded-[10px] border-[1.5px] border-line-2 bg-white px-3.5 text-sm font-bold">{t('cancelRequest')}</button>
      )}
    </div>
  )
}

function DeleteButton({ isPresident, requested, busy, label, onRemove, onRequest }: {
  isPresident: boolean; requested: boolean; busy: boolean; label: string; onRemove: () => void; onRequest: () => void
}) {
  const { t } = useI18n()
  if (requested) return null
  return (
    <button
      type="button"
      disabled={busy}
      onClick={isPresident ? onRemove : onRequest}
      aria-label={isPresident ? t('deleteAria', { name: label }) : t('requestAria', { name: label })}
      className={`flex h-11 w-11 flex-none items-center justify-center rounded-full ${isPresident ? 'text-out-dark' : 'text-ink-3'}`}
    >
      <IconTrash size={18} />
    </button>
  )
}

function DonationCard({ d, busy, isPresident, userId, requester, onCollect, onResend, remove, request, clear }: {
  d: Donation; busy: boolean; isPresident: boolean; userId: string; requester: string; onCollect: () => void; onResend: () => void
} & EntryActions) {
  const { t } = useI18n()
  const bal = d.total - d.paid
  const paid = bal === 0
  return (
    <li className="rounded-2xl border border-line bg-white pb-1.5 pl-3 pr-1.5 pt-2.5">
      <div className="flex items-center gap-3 pr-1.5">
        <span className={`flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full text-[17px] font-bold ${paid ? 'bg-durva-soft text-durva-dark' : 'bg-due-tint text-due-text'}`}>
          {initial(d.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">{d.name}</span>
          {d.house && <span className="block truncate text-[13px] text-ink-3">{d.house}</span>}
        </span>
        <span className="text-lg font-bold">{rs(d.total)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-dashed border-line pt-1.5">
        <span className="text-[13px] font-semibold text-ink-3">{t('receiptShort', { n: d.receipt_no })}</span>
        <span className="flex-1" />
        {paid ? (
          <>
            <span className="rounded-full bg-durva-soft px-2 py-0.5 text-xs font-bold text-durva-dark">✓ {t('statusPaid')}</span>
            <button type="button" onClick={onResend} aria-label={t('resendAria', { name: d.name })} className="flex h-11 w-11 items-center justify-center rounded-full bg-durva text-white">
              <IconChat size={16} />
            </button>
          </>
        ) : (
          <>
            <span className="rounded-full bg-due-tint px-2 py-0.5 text-xs font-bold text-due-dark">
              {d.paid > 0 ? t('pillDue', { amount: rs(bal) }) : t('statusPending')}
            </span>
            <button type="button" disabled={busy} onClick={onCollect} aria-label={t('collectAria', { name: d.name })} className="flex h-11 items-center gap-1 rounded-[10px] bg-durva px-3 text-[13px] font-bold text-white">
              <IconCheck size={14} />
              {t('collect')}
            </button>
          </>
        )}
        <DeleteButton isPresident={isPresident} requested={Boolean(d.delete_requested_by)} busy={busy} label={d.name} onRemove={remove} onRequest={request} />
      </div>
      {d.delete_requested_by && (
        <RequestStrip by={requester} mine={d.delete_requested_by === userId} isPresident={isPresident} onKeep={clear} onRemove={remove} onCancel={clear} busy={busy} />
      )}
    </li>
  )
}

function ExpenseCard({ e, busy, isPresident, userId, requester, sub, title, remove, request, clear }: {
  e: Expense; busy: boolean; isPresident: boolean; userId: string; requester: string; sub: string; title: string
} & EntryActions) {
  const { t } = useI18n()
  return (
    <li className="rounded-2xl border border-line bg-white py-2.5 pl-3 pr-1.5">
      <div className="flex items-center gap-3">
        <span className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-full bg-out-tint text-out">{categoryIcon(e.category)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">{title}</span>
          <span className="block truncate text-[13px] text-ink-3">{sub}</span>
          {e.bill_url && (
            <a href={e.bill_url} target="_blank" rel="noreferrer" className="text-[13px] font-bold text-kumkum underline">{t('viewBill')}</a>
          )}
        </span>
        <span className="text-[17px] font-bold text-out">{rs(e.amount)}</span>
        <DeleteButton isPresident={isPresident} requested={Boolean(e.delete_requested_by)} busy={busy} label={title} onRemove={remove} onRequest={request} />
      </div>
      {e.delete_requested_by && (
        <RequestStrip by={requester} mine={e.delete_requested_by === userId} isPresident={isPresident} onKeep={clear} onRemove={remove} onCancel={clear} busy={busy} />
      )}
    </li>
  )
}

function Bin({ open, onToggle, items }: {
  open: boolean
  onToggle: () => void
  items: { id: string; title: string; sub: string; meta: string; initial: string; restore?: () => void }[]
}) {
  const { t } = useI18n()
  return (
    <section aria-label={t('recentlyDeleted')} className="mt-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-line-2 bg-paper px-3 text-left text-[15px] font-bold text-ink-2"
      >
        <IconTrash size={18} />
        <span className="flex-1">{t('recentlyDeleted')}</span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-bg-2 px-1.5 text-[13px]">{items.length}</span>
        <IconChevron size={18} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <>
          <p className="m-0 px-1 pb-1.5 pt-2 text-xs text-ink-3">{t('binNote')}</p>
          {items.length === 0 ? (
            <div className="rounded-xl bg-paper p-3.5 text-center text-sm text-ink-3">{t('binEmpty')}</div>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 rounded-[14px] border border-line bg-paper py-2.5 pl-3 pr-2">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-bg-2 text-base font-bold text-ink-3">{it.initial}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold text-ink-2">{it.title}</span>
                    <span className="block text-[13px] text-ink-3">{it.sub}</span>
                    <span className="block text-xs text-ink-4">{it.meta}</span>
                  </span>
                  {it.restore && (
                    <button type="button" onClick={it.restore} aria-label={t('restoreAria', { name: it.title })} className="flex h-11 flex-none items-center gap-1.5 rounded-[10px] border-[1.5px] border-kumkum bg-white px-3 text-sm font-bold text-kumkum">
                      <IconRestore size={16} />
                      {t('restore')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function Empty({ text, to, cta }: { text: string; to: string; cta: ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-2 bg-white px-4 py-8 text-center">
      <p className="m-0 text-[15px] text-ink-3">{text}</p>
      <Link to={to} className="flex h-12 items-center gap-2 rounded-xl bg-durva px-4 text-base font-bold text-white">
        <IconPlus size={18} />
        {cta}
      </Link>
    </div>
  )
}
