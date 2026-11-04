import { Link } from 'react-router-dom'
import { useI18n } from '../lib/i18n'
import { useMandal } from '../lib/session'
import { Screen, MandalLogo, ActionBar } from '../components/ui'
import { InviteCard } from '../components/InviteCard'
import { IconCircleCheck } from '../components/Icons'

/** Shown right after a president creates the mandal. */
export default function Invite() {
  const { t } = useI18n()
  const { mandal } = useMandal()
  return (
    <Screen bg="bg-white">
      <div className="flex flex-1 flex-col gap-5 px-5 pt-8">
        <div className="flex items-center gap-3">
          <MandalLogo url={mandal.logo_url} size={56} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-bold text-durva">
              <IconCircleCheck size={18} />
              {t('createMandal')}
            </div>
            <h1 className="m-0 text-[22px] font-bold leading-tight">{mandal.name}</h1>
          </div>
        </div>
        <InviteCard mandal={mandal} />
      </div>
      <ActionBar>
        <Link to="/" className="flex h-[60px] items-center justify-center rounded-2xl bg-kumkum text-[19px] font-bold text-white">
          {t('start')}
        </Link>
      </ActionBar>
    </Screen>
  )
}
