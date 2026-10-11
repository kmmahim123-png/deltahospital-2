import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pulse Specialised Hospital - Online Doctor Appointment & Booking',
  description:
    'Book online appointments with expert doctors at Pulse Specialised Hospital, Dhaka. Browse specialist doctors, check schedules, and book care services easily.',
  generator: 'v0.app',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  keywords: [
    'Pulse Specialised Hospital',
    'Pulse Hospital Dhaka',
    'Pulse Hospital Donia',
    'Pulse Hospital online appointment',
    'doctor booking Dhaka',
    'Pulse Hospital Dholaipar',
    'online doctor consultation Bangladesh',
  ],
  verification: {
    google: 'k3njAbcHQVmj8iyCK5tcXinldr0dfCraL69GjBt3OXE',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1729' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}