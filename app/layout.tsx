import type { Metadata, Viewport } from 'metadata'
import './globals.css'

export const metadata: Metadata = {
  title: 'Delta Health Care Jatrabari Ltd.',
  description: 'Hospital Appointment Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-white text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}