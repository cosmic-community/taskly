import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

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
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Console capture script for dashboard debugging */}
        <script src="/dashboard-console-capture.js" />
        {children}
      </body>
    </html>
  )
}