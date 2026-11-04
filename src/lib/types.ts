export type Role = 'president' | 'volunteer'

export interface Mandal {
  id: string
  name: string
  festival: string
  year: number
  logo_url: string | null
  join_code: string
  receipt_seq: number
  has_recovery_key: boolean
  created_by: string
  created_at: string
}

export interface Member {
  mandal_id: string
  user_id: string
  name: string
  phone: string
  role: Role
  ward: string | null
  joined_at: string
}

export interface Donation {
  id: string
  mandal_id: string
  receipt_no: number
  name: string
  house: string | null
  phone: string | null
  total: number
  paid: number
  created_by: string
  created_at: string
  paid_updated_at: string | null
  delete_requested_by: string | null
  delete_requested_at: string | null
  deleted_by: string | null
  deleted_at: string | null
}

export type ExpenseCategory = 'decoration' | 'prasad' | 'pandal' | 'light' | 'puja' | 'other'

export interface Expense {
  id: string
  mandal_id: string
  amount: number
  category: ExpenseCategory
  label: string | null
  paid_to: string | null
  bill_url: string | null
  created_by: string
  created_at: string
  delete_requested_by: string | null
  delete_requested_at: string | null
  deleted_by: string | null
  deleted_at: string | null
}

export type EntryKind = 'donation' | 'expense'
