import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import CosmicBadge from '@/components/CosmicBadge';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Taskly - Personal Kanban Board',
  description: 'A beautiful, intuitive kanban board for personal task management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Access environment variable on server side
  const bucketSlug = process.env.COSMIC_BUCKET_SLUG as string;

  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Pass bucket slug as prop to client component */}
        <CosmicBadge bucketSlug={bucketSlug} />
      </body>
    </html>
  );
}