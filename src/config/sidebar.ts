import {
  LucideIcon,
  Home,
  Settings,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Camera,
  Video,
  Package,
  ShoppingBag,
  StickyNote,
  Globe,
  Search,
  Scissors,
  CalendarDays,
  CreditCard,
  Receipt,
  UsersRound,
  CalendarCheck,
  UserPlus,
  Wallet,
  GraduationCap,
  Send,
  FileCheck,
  Wrench,
  Archive,
  ArrowLeftRight,
} from 'lucide-react'

export interface SidebarItem {
  title: string
  href?: string
  icon: LucideIcon
  badge?: string | number
  children?: SidebarItem[]
  disabled?: boolean
  external?: boolean
}

export interface SidebarConfig {
  logo: {
    src: string
    alt: string
    href: string
    text?: string
  }
  sections: {
    title?: string
    items: SidebarItem[]
  }[]
}

// Admin sidebar — used by /admin layout
export const studioflowAdminConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/admin',
    text: 'StudioFlow',
  },
  sections: [
    {
      items: [
        { title: 'Dashboard', href: '/admin', icon: Home },
        { title: 'Couples', href: '/admin/couples', icon: Users },
      ],
    },
    {
      items: [
        {
          title: 'Marketing',
          icon: BarChart3,
          children: [
            { title: 'SIGS SEO', href: '/admin/marketing/sigs-seo', icon: Search },
            { title: 'BridalFlow', href: 'https://studioflow-zeta.vercel.app/leads', icon: Globe, external: true },
          ],
        },
        {
          title: 'Sales',
          icon: ShoppingBag,
          children: [
            { title: 'Couple Quotes', href: '/admin/sales/quotes', icon: FileText },
            { title: 'Frames & Albums', href: '/admin/sales/frames', icon: ShoppingBag },
            { title: 'Extras Sales', href: '/admin/sales/extras', icon: Package },
            { title: 'Documents', href: '/admin/documents', icon: FileCheck },
            { title: 'Show Results', href: '/admin/sales/show-results', icon: BarChart3 },
          ],
        },
        {
          title: 'Production',
          icon: Package,
          children: [
            { title: 'Photo Editing', href: '/admin/production/photo', icon: Camera },
            { title: 'Video Editing', href: '/admin/production/video', icon: Video },
            { title: 'Add Editing Job', href: '/admin/production/editing/new', icon: Scissors },
            { title: 'Archive', href: '/admin/production/archive', icon: Archive },
          ],
        },
        {
          title: 'Wedding Day',
          icon: CalendarCheck,
          children: [
            { title: 'Crew Call Sheet', href: '/admin/wedding-day/crew-confirm', icon: Send },
            { title: 'Equipment', href: '/admin/wedding-day/equipment', icon: Wrench },
            { title: 'Wedding Day Forms', href: '/admin/wedding-day/forms', icon: FileCheck },
          ],
        },
      ],
    },
    {
      items: [
        {
          title: 'Team Hub',
          icon: UsersRound,
          children: [
            { title: 'Work Schedule', href: '/admin/team/schedule', icon: CalendarDays },
            { title: 'Team Members', href: '/admin/team/members', icon: UserPlus },
            { title: 'Team Training', href: '/admin/team/training', icon: GraduationCap },
            { title: 'Team Notes', href: '/admin/team/notes', icon: StickyNote },
          ],
        },
        {
          title: 'Finance',
          icon: DollarSign,
          children: [
            { title: 'Command Center', href: '/admin/finance', icon: DollarSign },
            { title: 'Income Ledger', href: '/admin/finance/income', icon: CreditCard },
            { title: 'Expense Ledger', href: '/admin/finance/expenses', icon: Wallet },
            { title: 'Tax & Compliance', href: '/admin/finance/tax', icon: Receipt },
            { title: 'Reconciliation', href: '/admin/finance/reconciliation', icon: ArrowLeftRight },
          ],
        },
        { title: 'Settings', href: '/admin/settings', icon: Settings },
      ],
    },
  ],
}

// Client-only config (for sales calls — minimal sidebar)
export const studioflowClientConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/admin',
    text: 'StudioFlow',
  },
  sections: [
    {
      items: [
        { title: 'New Client Quote', href: '/client/new-quote', icon: FileText },
        { title: 'Frames & Albums', href: '/client/extras-quote', icon: DollarSign },
        { title: 'Extras', href: '/client/extras', icon: Package },
      ],
    },
  ],
}
