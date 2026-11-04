import { useI18n } from '../lib/i18n'

export function LangToggle() {
  const { lang, setLang, t } = useI18n()
  const btn = (l: 'mr' | 'en', label: string) => (
    <button
      type="button"
      lang={l}
      aria-pressed={lang === l}
      onClick={() => setLang(l)}
      className={`h-10 min-w-11 rounded-full px-2.5 text-sm font-bold ${lang === l ? 'bg-kumkum text-white' : 'text-ink-2'}`}
    >
      {label}
    </button>
  )
  return (
    <div role="group" aria-label={t('language')} className="flex flex-none rounded-full bg-bg-2 p-[3px]">
      {btn('mr', 'मराठी')}
      {btn('en', 'EN')}
    </div>
  )
}
