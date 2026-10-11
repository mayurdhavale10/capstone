import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | RoadIQ — AI Road Intelligence',
    default: 'RoadIQ — AI Road Intelligence System',
  },
  description:
    'AI-powered road intelligence platform for pavement damage detection, health assessment, road comparison, and infrastructure planning.',
  keywords: ['road intelligence', 'pavement damage', 'AI road detection', 'infrastructure planning'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
