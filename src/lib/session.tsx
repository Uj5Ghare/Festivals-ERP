import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, isConfigured } from './supabase'
import type { Mandal, Member } from './types'

interface SessionCtx {
  session: Session | null
  userId: string | null
  authLoading: boolean
  member: Member | null
  mandal: Mandal | null
  memberLoading: boolean
  isPresident: boolean
  refreshMembership: () => Promise<void>
}

const Ctx = createContext<SessionCtx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(isConfigured)
  const qc = useQueryClient()

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (!s) qc.clear()
    })
    return () => sub.subscription.unsubscribe()
  }, [qc])

  const userId = session?.user.id ?? null

  const membership = useQuery({
    queryKey: ['membership', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*, mandal:mandals(*)')
        .eq('user_id', userId!)
        .order('joined_at', { ascending: true })
        .limit(1)
      if (error) throw error
      const row = data?.[0] as (Member & { mandal: Mandal }) | undefined
      if (!row) return { member: null, mandal: null }
      const { mandal, ...member } = row
      return { member: member as Member, mandal }
    },
  })

  const value: SessionCtx = {
    session,
    userId,
    authLoading,
    member: membership.data?.member ?? null,
    mandal: membership.data?.mandal ?? null,
    memberLoading: Boolean(userId) && membership.isLoading,
    isPresident: membership.data?.member?.role === 'president',
    refreshMembership: async () => {
      await qc.invalidateQueries({ queryKey: ['membership'] })
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSession(): SessionCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSession outside SessionProvider')
  return v
}

/** For screens that only render once a mandal is loaded (guarded by the router). */
export function useMandal() {
  const s = useSession()
  if (!s.mandal || !s.member || !s.userId) throw new Error('useMandal without a mandal')
  return { mandal: s.mandal, member: s.member, userId: s.userId, isPresident: s.isPresident }
}
