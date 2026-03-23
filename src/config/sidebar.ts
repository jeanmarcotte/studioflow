import {
  LucideIcon,
  Home,
  Settings,
  Users,
  FileText,
  DollarSign,
  BarChart3,
  Mail,
  Camera,
  Video,
  Package,
  ShoppingBag,
  StickyNote,
  Globe,
  Search,
  Scissors,
  ClipboardList,
  CalendarDays,
  Upload,
  CreditCard,
  Clock,
  UsersRound,
  CalendarCheck,
  UserPlus,
  Wallet,
  GraduationCap,
  Send,
  PackageCheck,
  FileCheck,
  CheckCircle2,
  ListChecks,
  Wrench,
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
          title: 'Production',
          icon: Package,
          children: [
            { title: 'Photo Editing', href: '/admin/production/photo', icon: Camera },
            { title: 'Video Editing', href: '/admin/production/video', icon: Video },
            { title: 'Add Editing Job', href: '/admin/production/editing/new', icon: Scissors },
            { title: 'Equipment Inventory', href: '/admin/production/equipment', icon: Wrench },
          ],
        },
        {
          title: 'Marketing',
          icon: BarChart3,
          children: [
            { title: 'SIGS SEO', href: '/admin/marketing/sigs-seo', icon: Search },
            { title: 'BridalFlow Leads', href: 'https://bridalflow.vercel.app/admin', icon: Globe, external: true },
          ],
        },
        {
          title: 'Sales',
          icon: ShoppingBag,
          children: [
            { title: 'Couple Quotes', href: '/admin/sales/quotes', icon: FileText },
            { title: 'Frames & Albums', href: '/admin/sales/frames', icon: ShoppingBag },
            { title: 'Extras Sales', href: '/admin/sales/extras', icon: Package },
          ],
        },
        {
          title: 'Client Portal',
          icon: FileText,
          children: [
            { title: 'New Client Quote', href: '/admin/client/new-quote', icon: FileText },
            { title: 'Extras Sales', href: '/admin/client/extras-sales', icon: Package },
            { title: 'Communication', href: '/admin/client/communication', icon: Mail },
            { title: 'Wedding Day Form', href: '/client/wedding-day-form', icon: ClipboardList },
          ],
        },
      ],
    },
    {
      items: [
        {
          title: 'Finance',
          icon: DollarSign,
          children: [
            { title: 'Dashboard', href: '/admin/finance', icon: DollarSign },
            { title: 'Accounts', href: '/admin/finance/accounts', icon: CreditCard },
            { title: 'Upcoming', href: '/admin/finance/upcoming', icon: Clock },
            { title: 'Upload Payments', href: '/admin/finance/upload', icon: Upload },
          ],
        },
        {
          title: 'Team Hub',
          icon: UsersRound,
          children: [
            { title: 'Work Schedule', href: '/admin/team/schedule', icon: CalendarDays },
            { title: 'Team Notes', href: '/admin/team/notes', icon: StickyNote },
            { title: 'Team Members', href: '/admin/team/members', icon: UserPlus },
            { title: 'Team Payments', href: '/admin/team/payments', icon: Wallet },
            { title: 'Training & Education', href: '/admin/team/training', icon: GraduationCap },
          ],
        },
        {
          title: 'Wedding Day',
          icon: CalendarCheck,
          children: [
            { title: 'Crew Call Sheet', href: '/admin/wedding-day/crew-confirm', icon: Send },
            { title: 'Equipment Packing', href: '/admin/wedding-day/packing', icon: PackageCheck },
            { title: 'Wedding Day Forms', href: '/admin/wedding-day/forms', icon: FileCheck },
            { title: 'Coordination', href: '/admin/wedding-day/coordination', icon: CheckCircle2 },
            { title: 'Prep Checklist', href: '/admin/wedding-day/checklist', icon: ListChecks },
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
