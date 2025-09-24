import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CosmicBadge from '@/components/CosmicBadge'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskly - Liquid Glass Kanban Board',
  description: 'A beautiful personal Kanban board with Apple-inspired liquid glass design. Create boards, columns, and cards with sophisticated drag-and-drop functionality.',
  keywords: 'kanban, trello, tasks, productivity, project management, liquid glass, apple design',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get bucket slug from environment variables on server side
  const bucketSlug = process.env.COSMIC_BUCKET_SLUG || 'taskly-app'

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Console capture script for dashboard debugging */}
        <script src="/dashboard-console-capture.js" />
        {children}
        {/* Built with Cosmic badge - dark mode for liquid glass design */}
        <CosmicBadge bucketSlug={bucketSlug} />
      </body>
    </html>
  )
}