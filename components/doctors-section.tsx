"use client"

import { useMemo, useState } from "react"
import { ChevronDown, SlidersHorizontal, Search, X } from "lucide-react"
import { doctors, DAYS, SPECIALIZATIONS, type Day, type Doctor, type Specialization } from "@/lib/doctors"
import { DoctorCard } from "@/components/doctor-card"
import { BookingModal } from "@/components/booking-modal"

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  allLabel: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40 cursor-pointer"
        >
          <option value="">{allLabel}</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </label>
  )
}

export function DoctorsSection() {
  const [spec, setSpec] = useState<string>("")
  const [day, setDay] = useState<string>("")
  const [query, setQuery] = useState<string>("")
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      if (spec && d.specialization !== (spec as Specialization)) return false
      if (day && !d.schedule.some((s) => s.days.includes(day as Day))) return false
      if (query) {
        const q = query.toLowerCase()
        const haystack = `${d.name} ${d.nameBn} ${d.specialization} ${d.title} ${d.qualifications}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [spec, day, query])

  const hasFilters = spec || day || query

  return (
    <section id="doctors" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-primary">Our Specialists</p>
        <h2 className="mt-2 text-balance text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
          Consult Our Expert Doctors
        </h2>
        <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-pretty text-muted-foreground px-2">
          Board-certified consultants across every major speciality — book a visit that fits your schedule.
        </p>
      </div>

      {/* Filters Section */}
      <div className="mt-6 sm:mt-8 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          Find your doctor
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.4fr]">
          <FilterSelect
            label="Filter by Specialization"
            value={spec}
            onChange={setSpec}
            options={SPECIALIZATIONS}
            allLabel="All Specializations"
          />
          <FilterSelect
            label="Filter by Day"
            value={day}
            onChange={setDay}
            options={DAYS}
            allLabel="Any Day"
          />
          <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search by name
            </span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Dr. Rahman"
                aria-label="Search doctors by name"
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-sm font-medium outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 pt-2 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of {doctors.length} doctors
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSpec("")
                setDay("")
                setQuery("")
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold text-primary transition hover:bg-accent cursor-pointer"
            >
              <X className="size-4" aria-hidden="true" />
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Doctors Grid Optimized for Mobile */}
      {filtered.length > 0 ? (
        <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} onBook={setBookingDoctor} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-muted/40 p-8 sm:p-12 text-center">
          <p className="text-base sm:text-lg font-semibold text-foreground">No doctors match your filters</p>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Try a different specialization or day.</p>
        </div>
      )}

      <BookingModal
        doctor={bookingDoctor}
        open={bookingDoctor !== null}
        onClose={() => setBookingDoctor(null)}
      />
    </section>
  )
}