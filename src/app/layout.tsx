import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import './globals.css'
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'StudioFlow - SIGS Photography',
  description: 'Business management system for SIGS Photography - Client quotes, admin dashboard, and production tracking',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", manrope.variable)}>
      <body className={cn("font-sans antialiased", manrope.variable)}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NuqsAdapter>
            {children}
          </NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
