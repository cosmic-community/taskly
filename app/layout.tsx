import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import CosmicBadge from '@/components/CosmicBadge'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Taskly - Personal Kanban Board',
  description: 'A minimal personal Trello-style Kanban board. Create boards, columns, and cards with drag-and-drop functionality.',
  keywords: 'kanban, trello, tasks, productivity, project management',
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
        {/* Built with Cosmic badge */}
        <CosmicBadge bucketSlug={bucketSlug} />
      </body>
    </html>
  )
}