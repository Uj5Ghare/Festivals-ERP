import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, FILES_BUCKET } from './supabase'
import type { Donation, EntryKind, Expense, ExpenseCategory, Member } from './types'
import { shrinkImage } from './format'

// ---------------------------------------------------------------- reads

export function useDonations(mandalId: string) {
  return useQuery({
    queryKey: ['donations', mandalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('mandal_id', mandalId)
        .order('receipt_no', { ascending: false })
      if (error) throw error
      return data as Donation[]
    },
  })
}

export function useExpenses(mandalId: string) {
  return useQuery({
    queryKey: ['expenses', mandalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('mandal_id', mandalId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useMembers(mandalId: string) {
  return useQuery({
    queryKey: ['members', mandalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('mandal_id', mandalId)
        .order('joined_at', { ascending: true })
      if (error) throw error
      return data as Member[]
    },
  })
}

export function useLabels(mandalId: string) {
  return useQuery({
    queryKey: ['labels', mandalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_labels')
        .select('label')
        .eq('mandal_id', mandalId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as { label: string }[]).map((r) => r.label)
    },
  })
}

/** Live updates: when any volunteer saves something, everyone's screen refreshes. */
export function useRealtime(mandalId: string | undefined) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!mandalId) return
    const filter = `mandal_id=eq.${mandalId}`
    const channel = supabase
      .channel(`mandal-${mandalId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donations', filter }, () =>
        qc.invalidateQueries({ queryKey: ['donations', mandalId] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter }, () =>
        qc.invalidateQueries({ queryKey: ['expenses', mandalId] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members', filter }, () => {
        qc.invalidateQueries({ queryKey: ['members', mandalId] })
        qc.invalidateQueries({ queryKey: ['membership'] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mandals', filter: `id=eq.${mandalId}` }, () =>
        qc.invalidateQueries({ queryKey: ['membership'] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [mandalId, qc])
}

// ---------------------------------------------------------------- writes

async function rpc<T = void>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export const api = {
  createMandal: (name: string, memberName: string, phone: string) =>
    rpc<string>('create_mandal', { p_name: name, p_member_name: memberName, p_phone: phone }),

  joinMandal: (code: string, memberName: string, phone: string) =>
    rpc<string>('join_mandal', { p_code: code, p_member_name: memberName, p_phone: phone }),

  createDonation: (args: { mandalId: string; name: string; house: string; phone: string; total: number; paid: number }) =>
    rpc<Donation>('create_donation', {
      p_mandal: args.mandalId,
      p_name: args.name,
      p_house: args.house,
      p_phone: args.phone,
      p_total: args.total,
      p_paid: args.paid,
    }),

  markPaid: (id: string) => rpc('mark_donation_paid', { p_id: id }),
  requestDelete: (kind: EntryKind, id: string) => rpc('request_delete', { p_kind: kind, p_id: id }),
  clearRequest: (kind: EntryKind, id: string) => rpc('clear_delete_request', { p_kind: kind, p_id: id }),
  softDelete: (kind: EntryKind, id: string) => rpc('soft_delete', { p_kind: kind, p_id: id }),
  restore: (kind: EntryKind, id: string) => rpc('restore_entry', { p_kind: kind, p_id: id }),

  async createExpense(args: {
    mandalId: string
    userId: string
    amount: number
    category: ExpenseCategory
    label: string | null
    paidTo: string
    bill: File | null
    keepLabel: boolean
  }) {
    let billUrl: string | null = null
    if (args.bill) billUrl = await uploadImage(args.mandalId, 'bill', args.bill, 1600)
    const { error } = await supabase.from('expenses').insert({
      mandal_id: args.mandalId,
      amount: args.amount,
      category: args.category,
      label: args.label,
      paid_to: args.paidTo.trim() || null,
      bill_url: billUrl,
      created_by: args.userId,
    })
    if (error) throw error
    if (args.keepLabel && args.label) {
      await supabase.from('expense_labels').upsert({ mandal_id: args.mandalId, label: args.label }, { ignoreDuplicates: true })
    }
  },

  async renameMandal(mandalId: string, name: string) {
    const { error } = await supabase.from('mandals').update({ name }).eq('id', mandalId)
    if (error) throw error
  },

  async setLogo(mandalId: string, file: File) {
    const url = await uploadImage(mandalId, 'logo', file, 512)
    const { error } = await supabase.from('mandals').update({ logo_url: url }).eq('id', mandalId)
    if (error) throw error
  },

  async createRecoveryKey(mandalId: string): Promise<string> {
    const { data, error } = await supabase.rpc('create_recovery_key', { p_mandal: mandalId })
    if (error) throw error
    return data as string
  },

  async resetMemberPin(mandalId: string, userId: string, pin: string) {
    const { error } = await supabase.rpc('reset_member_pin', { p_mandal: mandalId, p_user: userId, p_pin: pin })
    if (error) throw error
  },

  async removeMember(mandalId: string, userId: string) {
    const { error } = await supabase.from('members').delete().eq('mandal_id', mandalId).eq('user_id', userId)
    if (error) throw error
  },
}

async function uploadImage(mandalId: string, prefix: string, file: File, maxSide: number): Promise<string> {
  const blob = await shrinkImage(file, maxSide)
  const type = blob.type || 'image/jpeg'
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
  // A fresh name every time, so no overwrite (upsert) is needed
  const path = `${mandalId}/${prefix}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, blob, { contentType: type, upsert: false })
  if (error) throw error
  return supabase.storage.from(FILES_BUCKET).getPublicUrl(path).data.publicUrl
}

// ---------------------------------------------------------------- derived numbers

export function totals(donations: Donation[] | undefined, expenses: Expense[] | undefined) {
  const live = (donations ?? []).filter((d) => !d.deleted_at)
  const liveExp = (expenses ?? []).filter((e) => !e.deleted_at)
  const paidIn = live.reduce((s, d) => s + d.paid, 0)
  const due = live.reduce((s, d) => s + (d.total - d.paid), 0)
  const out = liveExp.reduce((s, e) => s + e.amount, 0)
  return {
    paidIn,
    due,
    promised: paidIn + due,
    out,
    balance: paidIn - out,
    houses: live.length,
    paidHouses: live.filter((d) => d.paid >= d.total).length,
    dueHouses: live.filter((d) => d.paid < d.total).length,
  }
}
