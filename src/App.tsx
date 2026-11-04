import { Navigate, Route, Routes } from 'react-router-dom'
import { isConfigured } from './lib/supabase'
import { useSession } from './lib/session'
import type { ReactNode } from 'react'
import { useI18n } from './lib/i18n'
import { useRealtime } from './lib/api'
import { useOnline } from './lib/device'
import { Screen, Spinner } from './components/ui'
import Login from './pages/Login'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Donation from './pages/Donation'
import DonationDone from './pages/DonationDone'
import Receipt from './pages/Receipt'
import Expense from './pages/Expense'
import Records from './pages/Records'
import Report from './pages/Report'
import Profile from './pages/Profile'
import Invite from './pages/Invite'

export default function App() {
  const { t } = useI18n()
  const { session, authLoading, member, mandal, memberLoading } = useSession()

  if (!isConfigured) {
    return (
      <Screen>
        <div className="m-6 rounded-2xl border border-out-line bg-out-tint p-5 text-[15px] font-semibold text-out-dark">{t('notConfigured')}</div>
      </Screen>
    )
  }
  if (authLoading || memberLoading) {
    return (
      <Screen>
        <Spinner label={t('loading')} />
      </Screen>
    )
  }
  if (!session) return <Login />
  if (!member || !mandal) {
    return (
      <Routes>
        <Route path="/invite" element={<Screen><Spinner label={t('loading')} /></Screen>} />
        <Route path="*" element={<Setup />} />
      </Routes>
    )
  }
  return <MandalRoutes mandalId={mandal.id} />
}

function MandalRoutes({ mandalId }: { mandalId: string }) {
  useRealtime(mandalId)
  const online = useOnline()
  const { t } = useI18n()
  return (
    <>
      {!online && (
        <div role="status" className="sticky top-0 z-40 mx-auto max-w-[480px] bg-ink px-4 py-2 text-center text-[13px] font-semibold text-white">
          {t('offline')}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vargani/new" element={<PresidentOnly><Donation /></PresidentOnly>} />
        <Route path="/vargani/:id/done" element={<DonationDone />} />
        <Route path="/vargani/:id/receipt" element={<Receipt />} />
        <Route path="/kharch/new" element={<PresidentOnly><Expense /></PresidentOnly>} />
        <Route path="/hisaab" element={<Records />} />
        <Route path="/report" element={<Report />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/invite" element={<PresidentOnly><Invite /></PresidentOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

/** Volunteers are read-only: screens that add or change data send them Home. */
function PresidentOnly({ children }: { children: ReactNode }) {
  const { isPresident } = useSession()
  return isPresident ? <>{children}</> : <Navigate to="/" replace />
}
