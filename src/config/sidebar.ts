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
            { title: 'Team Notes', href: '/admin/production/team-notes', icon: StickyNote },
          ],
        },
        {
          title: 'Marketing',
          icon: BarChart3,
          children: [
            { title: 'SIGS Photo', href: '/admin/marketing/sigs', icon: BarChart3 },
            { title: 'JeanMarcotte', href: '/admin/marketing/jeanmarcotte', icon: Globe },
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
          ],
        },
      ],
    },
    {
      items: [
        { title: 'Finance', href: '/admin/finance', icon: DollarSign },
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
      ],
    },
  ],
}
