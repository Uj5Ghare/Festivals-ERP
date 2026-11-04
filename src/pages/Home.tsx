import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { useDonations, useExpenses, totals } from '../lib/api'
import { rs } from '../lib/format'
import { Screen, Toran, MandalLogo, BottomNav } from '../components/ui'
import { IconArrowIn, IconArrowOut, IconList, IconLock, IconMinus, IconPlus, IconUser } from '../components/Icons'

export default function Home() {
  const { t, lang } = useI18n()
  const { mandal, isPresident } = useMandal()
  // Big buttons carry the other language in small text, as in the design
  const other = lang === 'mr' ? { d: 'Add Donation', e: 'Add Expense' } : { d: 'वर्गणी घ्या', e: 'खर्च लिहा' }
  const donations = useDonations(mandal.id)
  const expenses = useExpenses(mandal.id)
  const s = totals(donations.data, expenses.data)
  const loading = donations.isLoading || expenses.isLoading
  const money = (n: number) => (loading ? '—' : rs(n))

  return (
    <Screen>
      <header className="flex items-center gap-2.5 px-5 pb-2 pt-6">
        <MandalLogo url={mandal.logo_url} name={mandal.name} />
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[17px] font-bold leading-tight">{mandal.name}</div>
          <div className="text-[13px] text-ink-4">
            {t('yearLabel', { year: mandal.year })}
          </div>
        </div>
        <Link
          to="/profile"
          aria-label={t('profileAria')}
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border border-line bg-white text-ink-2"
        >
          <IconUser size={22} />
        </Link>
      </header>

      <section aria-label={t('balance')} className="mx-5 mt-3 overflow-hidden rounded-[20px] bg-kumkum px-5 pb-5 text-white">
        <Toran className="-mx-5 mb-2.5 w-[calc(100%+40px)]" />
        <div className="text-base font-medium text-haldi-tint">{t('balance')}</div>
        <div className="mt-0.5 text-[42px] font-bold leading-tight tracking-[-0.01em]">{money(s.balance)}</div>
        <div className="mt-3.5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/15 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm">
              <IconArrowIn size={14} />
              {t('moneyIn')}
            </div>
            <div className="mt-0.5 text-lg font-semibold">{money(s.paidIn)}</div>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm">
              <IconArrowOut size={14} />
              {t('moneyOut')}
            </div>
            <div className="mt-0.5 text-lg font-semibold">{money(s.out)}</div>
          </div>
        </div>
      </section>

      {!isPresident && (
        <section aria-label={t('readOnlyTitle')} className="mx-5 mt-4 flex flex-col gap-3 rounded-[20px] border border-line bg-white p-4">
          <div className="flex items-center gap-2 text-[17px] font-bold">
            <IconLock size={20} className="text-kumkum" />
            {t('readOnlyTitle')}
          </div>
          <p className="m-0 text-sm text-ink-3">{t('readOnlyNote')}</p>
          <Link to="/hisaab" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-kumkum text-lg font-bold text-white">
            <IconList size={20} />
            {t('viewRecords')}
          </Link>
        </section>
      )}

      {isPresident && !mandal.has_recovery_key && (
        <Link to="/profile" className="mx-5 mt-4 flex items-center gap-2 rounded-2xl border border-haldi bg-haldi-tint px-4 py-3 text-sm font-bold text-kumkum-dark">
          <IconLock size={18} />
          {t('recoveryNudge')}
        </Link>
      )}

      {isPresident && (
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <Link to="/vargani/new" className="flex min-h-[140px] flex-col justify-between gap-3.5 rounded-[20px] bg-durva px-4 py-[18px] text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <IconPlus size={26} />
          </span>
          <span>
            <span className="block text-[21px] font-bold leading-tight">{t('addDonation')}</span>
            <span className="block text-sm">{other.d}</span>
          </span>
        </Link>
        <Link to="/kharch/new" className="flex min-h-[140px] flex-col justify-between gap-3.5 rounded-[20px] bg-out px-4 py-[18px] text-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <IconMinus size={26} />
          </span>
          <span>
            <span className="block text-[21px] font-bold leading-tight">{t('addExpense')}</span>
            <span className="block text-sm">{other.e}</span>
          </span>
        </Link>
      </div>
      )}

      <div className="flex-1" />
      <BottomNav active="home" />
    </Screen>
  )
}
