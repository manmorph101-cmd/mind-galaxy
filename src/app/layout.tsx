import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '✦ Mind Galaxy',
  description: 'Your personal space for goals and growth',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
