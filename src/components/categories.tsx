import type { ReactNode } from 'react'
import type { DictKey } from '../lib/i18n'
import type { ExpenseCategory } from '../lib/types'
import { IconBowl, IconBulb, IconDiya, IconDots, IconSparkle, IconTent } from './Icons'

export const CATEGORIES: { key: ExpenseCategory; label: DictKey; icon: (size: number) => ReactNode }[] = [
  { key: 'decoration', label: 'cat_decoration', icon: (s) => <IconSparkle size={s} /> },
  { key: 'prasad', label: 'cat_prasad', icon: (s) => <IconBowl size={s} /> },
  { key: 'pandal', label: 'cat_pandal', icon: (s) => <IconTent size={s} /> },
  { key: 'light', label: 'cat_light', icon: (s) => <IconBulb size={s} /> },
  { key: 'puja', label: 'cat_puja', icon: (s) => <IconDiya size={s} /> },
  { key: 'other', label: 'cat_other', icon: (s) => <IconDots size={s} /> },
]

export function categoryIcon(key: ExpenseCategory, size = 20) {
  return CATEGORIES.find((c) => c.key === key)!.icon(size)
}
