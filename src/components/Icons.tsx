import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconBack = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M15 18l-6-6 6-6" /></Svg>
export const IconPlus = (p: P) => <Svg strokeWidth={2.5} {...p}><path d="M12 5v14M5 12h14" /></Svg>
export const IconMinus = (p: P) => <Svg strokeWidth={2.5} {...p}><path d="M5 12h14" /></Svg>
export const IconCheck = (p: P) => <Svg strokeWidth={2.6} {...p}><path d="M5 12l5 5L20 7" /></Svg>
export const IconClose = (p: P) => <Svg strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
export const IconUser = (p: P) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>
export const IconHome = (p: P) => <Svg {...p}><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>
export const IconList = (p: P) => (
  <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13" /><circle cx="3.5" cy="6" r="1" /><circle cx="3.5" cy="12" r="1" /><circle cx="3.5" cy="18" r="1" /></Svg>
)
export const IconArrowIn = (p: P) => <Svg strokeWidth={2.5} {...p}><path d="M17 7L7 17M7 9v8h8" /></Svg>
export const IconArrowOut = (p: P) => <Svg strokeWidth={2.5} {...p}><path d="M7 17L17 7M9 7h8v8" /></Svg>
export const IconCircleCheck = (p: P) => <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Svg>
export const IconClock = (p: P) => <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
export const IconHalf = (p: P) => (
  <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" /></Svg>
)
export const IconInfo = (p: P) => <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
export const IconAlert = (p: P) => <Svg strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5h.01" /></Svg>
export const IconCash = (p: P) => <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></Svg>
export const IconMic = (p: P) => <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></Svg>
export const IconContact = (p: P) => (
  <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7.5 17c.8-2 2.5-3 4.5-3s3.7 1 4.5 3" /></Svg>
)
export const IconPencil = (p: P) => <Svg {...p}><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></Svg>
export const IconCamera = (p: P) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>
export const IconChat = (p: P) => <Svg {...p}><path d="M21 12a8 8 0 0 1-11.8 7L4 20l1-5A8 8 0 1 1 21 12z" /></Svg>
export const IconTrash = (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>
export const IconRestore = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Svg>
export const IconChevron = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M6 9l6 6 6-6" /></Svg>
export const IconDownload = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>
export const IconChart = (p: P) => <Svg strokeWidth={2.2} {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>
export const IconPrint = (p: P) => <Svg {...p}><path d="M6 9V3h12v6M6 18H4v-7h16v7h-2" /><rect x="6" y="14" width="12" height="7" /></Svg>
export const IconShare = (p: P) => <Svg {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></Svg>
export const IconLock = (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
export const IconSearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
export const IconLogout = (p: P) => <Svg {...p}><path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3" /></Svg>
export const IconCopy = (p: P) => <Svg {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></Svg>
export const IconUsers = (p: P) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6" /></Svg>

// Expense category icons (same drawings as the design)
export const IconSparkle = (p: P) => <Svg {...p}><path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z" /></Svg>
export const IconBowl = (p: P) => <Svg {...p}><path d="M3 12h18a9 9 0 0 1-18 0z" /><path d="M8.5 8c0-2 1.5-2 1.5-4M14 8c0-2 1.5-2 1.5-4" /></Svg>
export const IconTent = (p: P) => <Svg {...p}><path d="M3 20L12 4l9 16z" /><path d="M9 20l3-6 3 6" /></Svg>
export const IconBulb = (p: P) => (
  <Svg {...p}><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" /></Svg>
)
export const IconDiya = (p: P) => (
  <Svg {...p}><path d="M12 3c1.8 2.6 3.5 4 3.5 7a3.5 3.5 0 0 1-7 0c0-1.7.8-2.8 1.8-3.8 0 1.6.8 2.6 1.7 2.6 0-2.4-.9-4.2 0-5.8z" /><path d="M4 17h16l-2.5 4h-11z" /></Svg>
)
export const IconDots = ({ size = 20 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
  </svg>
)
