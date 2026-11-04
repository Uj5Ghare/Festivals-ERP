import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && key)

export const supabase = createClient(url || 'https://not-configured.supabase.co', key || 'not-configured', {
  auth: { persistSession: true, autoRefreshToken: true },
})

/**
 * Volunteers log in with a mobile number and a 6-digit PIN — no SMS cost.
 * Supabase Auth needs an email, so the number is turned into a private
 * address that is never emailed. ("Confirm email" must be OFF in Supabase.)
 */
export function phoneToEmail(phone: string): string {
  return `m${phone}@phone.mandal-hisaab.app`
}

/** Keeps only the last 10 digits of an Indian mobile number. */
export function cleanPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  return d.length > 10 ? d.slice(-10) : d
}

export const FILES_BUCKET = 'mandal-files'
