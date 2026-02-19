'use client'

import { Layout } from '@/components/layout/layout'
import { studioflowAdminConfig } from '@/config/sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Layout sidebarConfig={studioflowAdminConfig}>
      {children}
    </Layout>
  )
}
