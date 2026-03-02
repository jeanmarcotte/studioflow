import { LucideIcon, Home, Settings, Users, FileText, DollarSign, BarChart3, Mail, Camera, Video, Package, ShoppingBag, StickyNote, Globe } from 'lucide-react'

export interface SidebarItem {
  title: string
  href: string
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

// Admin sidebar — main config used by /admin layout
export const studioflowAdminConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/admin/dashboard',
    text: 'StudioFlow'
  },
  sections: [
    {
      items: [
        {
          title: 'Mission Control',
          href: '/admin/dashboard',
          icon: Home,
        },
        {
          title: 'Couples',
          href: '/admin/couples',
          icon: Users,
        },
      ]
    },
    {
      title: 'Production',
      items: [
        {
          title: 'Photo Editing',
          href: '/admin/photo-editing',
          icon: Camera,
        },
        {
          title: 'Video Editing',
          href: '/admin/video-editing',
          icon: Video,
        },
        {
          title: 'Team Notes',
          href: '/admin/team-notes',
          icon: StickyNote,
        },
      ]
    },
    {
      title: 'Finance',
      items: [
        {
          title: 'Finance',
          href: '/admin/finance',
          icon: DollarSign,
        },
      ]
    },
    {
      title: 'Marketing',
      items: [
        {
          title: 'SIGS Photo',
          href: '/admin/marketing/sigs-photo',
          icon: BarChart3,
        },
        {
          title: 'JeanMarcotte',
          href: '/admin/marketing/jeanmarcotte',
          icon: Globe,
        },
      ]
    },
    {
      title: 'Sales',
      items: [
        {
          title: 'Couple Quotes',
          href: '/admin/client-quotes',
          icon: FileText,
        },
        {
          title: 'Frames & Albums',
          href: '/admin/frames-albums',
          icon: ShoppingBag,
        },
        {
          title: 'Extras Sales',
          href: '/admin/extras-sales',
          icon: Package,
        },
      ]
    },
    {
      title: 'Client Tools',
      items: [
        {
          title: 'New Client Quote',
          href: '/client/new-quote',
          icon: FileText,
        },
        {
          title: 'Frames & Albums',
          href: '/client/extras-quote',
          icon: DollarSign,
        },
        {
          title: 'Communication',
          href: '/admin/communication',
          icon: Mail,
        },
      ]
    },
    {
      items: [
        {
          title: 'Settings',
          href: '/settings',
          icon: Settings,
        }
      ]
    }
  ]
}

// Client-only config (for sales calls — minimal sidebar)
export const studioflowClientConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/admin/dashboard',
    text: 'StudioFlow'
  },
  sections: [
    {
      items: [
        {
          title: 'New Client Quote',
          href: '/client/new-quote',
          icon: FileText,
        },
        {
          title: 'Frames & Albums',
          href: '/client/extras-quote',
          icon: DollarSign,
        }
      ]
    }
  ]
}

// Legacy alias — keep backward compat for any imports
export const studioflowConfig = studioflowAdminConfig
