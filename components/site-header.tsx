"use client"

import { useState } from "react"
import { Phone, Mail, Search, Menu, X, FileText } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Find A Doctor", href: "#doctors" },
  { label: "Services", href: "#report" },
  { label: "Contact", href: "#contact" }, 
]

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      
      {/* Top utility strip */}
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-1.5 text-xs">
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="tel:01886700789" className="flex items-center gap-1.5 font-medium hover:underline">
              <Phone className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Mobile:</span> 01886700789
            </a>
            <a href="tel:02223340088" className="hidden items-center gap-1.5 font-medium hover:underline sm:flex">
              <Phone className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Tel:</span> 02223340088
            </a>
          </div>
          
          <div className="flex items-center gap-4">
            <a href="mailto:pulsespecialisedhospital@gmail.com" className="hidden items-center gap-1.5 hover:underline md:flex">
              <Mail className="size-3.5" aria-hidden="true" />
              pulsespecialisedhospital@gmail.com
            </a>
            <a 
              href="https://www.facebook.com/PulseSpecialisedHospital/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-white/20 hover:bg-white/30 p-1 rounded-full transition flex items-center justify-center"
              title="Visit our Facebook Page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3">
        {/* Logo and Hospital Name Fixed for Mobile & Dark Mode */}
        <a href="/" className="flex items-center shrink-0 gap-2 sm:gap-3">
          <img src="/logo.png" alt="Pulse Logo" className="h-12 sm:h-16 md:h-18 w-auto object-contain" />
          <div className="flex flex-col justify-center">
            <span className="text-sm sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Pulse Specialised
            </span>
            <span className="text-[10px] sm:text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 tracking-widest uppercase mt-0.5">
              Hospital Ltd.
            </span>
          </div>
        </a>

        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-3">
          <ThemeToggle />
          <a
            href="#report"
            aria-label="Report / Appointment"
            className="hidden sm:inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 sm:px-4"
          >
            <FileText className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Report / Appointment</span>
          </a>
          
          <button
            type="button"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-accent lg:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border bg-background lg:hidden shadow-lg">
          <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
            <form role="search" className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="search"
                placeholder="Search doctors, specialities..."
                aria-label="Search doctors and specialities"
                className="h-10 w-full rounded-full border border-input bg-muted/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/40"
              />
            </form>
            <nav className="flex flex-col" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/90 transition hover:bg-accent hover:text-accent-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <a
              href="#report"
              onClick={() => setMenuOpen(false)}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              <FileText className="size-4" aria-hidden="true" />
              Report / Appointment
            </a>
          </div>
        </div>
      )}
    </header>
  )
}