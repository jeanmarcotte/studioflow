import { LucideIcon, Home, Settings, Users, Calendar, FileText, DollarSign, BarChart3, Mail, Camera, Video, Package } from 'lucide-react'

export interface SidebarItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: string | number
  children?: SidebarItem[]
  disabled?: boolean
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

// StudioFlow Configuration - Two Modes
export const studioflowConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/client',
    text: 'StudioFlow'
  },
  sections: [
    {
      title: 'Client Mode',
      items: [
        {
          title: 'New Client Quote',
          href: '/client/new-quote',
          icon: FileText,
        },
        {
          title: 'Extras Quote',
          href: '/client/extras-quote',
          icon: DollarSign,
        },
        {
          title: 'Wedding Calendar',
          href: '/client/calendar',
          icon: Calendar,
        },
        {
          title: 'Communications',
          href: '/client/communications',
          icon: Mail,
        }
      ]
    },
    {
      title: 'Admin Mode',
      items: [
        {
          title: 'Dashboard',
          href: '/admin/dashboard',
          icon: Home,
        },
        {
          title: 'Couples',
          href: '/admin/couples',
          icon: Users,
          badge: 31 // 2026 active couples
        },
        {
          title: 'Photo Editing',
          href: '/admin/photo-editing',
          icon: Camera,
        },
        {
          title: 'Video Editing',
          href: '/admin/video-editing',
          icon: Video,
          badge: 20 // Outstanding videos
        },
        {
          title: 'Marketing',
          href: '/admin/marketing',
          icon: BarChart3,
        },
        {
          title: 'Production',
          href: '/admin/production',
          icon: Package,
        },
        {
          title: 'Finance',
          href: '/admin/finance',
          icon: DollarSign,
        },
        {
          title: 'Communications',
          href: '/admin/communications',
          icon: Mail,
        }
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

// Client-only config (for sales calls)
export const studioflowClientConfig: SidebarConfig = {
  logo: {
    src: '/sigs-logo.png',
    alt: 'SIGS Photography',
    href: '/client',
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
          title: 'Extras Quote',
          href: '/client/extras-quote',
          icon: DollarSign,
        },
        {
          title: 'Wedding Calendar',
          href: '/client/calendar',
          icon: Calendar,
        },
        {
          title: 'Communications',
          href: '/client/communications',
          icon: Mail,
        }
      ]
    }
  ]
}
