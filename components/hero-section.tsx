import { ShieldCheck, Clock, Users } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const stats = [
  { icon: Users, value: "40+", label: "Expert Consultants" },
  { icon: Clock, value: "24/7", label: "Emergency Care" },
  { icon: ShieldCheck, value: "15+", label: "Years of Trust" },
]

export function HeroSection() {
  return (
    <section
      id="home"
      className="relative scroll-mt-24 overflow-hidden border-b border-border bg-gradient-to-b from-accent/60 to-background"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-4 py-1.5 text-xs font-semibold text-primary">
            <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            Trusted specialised care in Bangladesh
          </span>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Your Health, Guided by the Right Specialist
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            Browse verified doctors, check live visiting schedules, and book an appointment in
            seconds — all in one place.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href="#doctors" className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6")}>
              Find a Doctor
            </a>
            <a
              href="#contact"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "rounded-full bg-transparent px-6")}
            >
              Contact Us
            </a>
          </div>
        </div>

        <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-4 text-center shadow-sm"
            >
              <s.icon className="size-6 text-primary" aria-hidden="true" />
              <dt className="text-2xl font-bold text-foreground">{s.value}</dt>
              <dd className="text-xs font-medium text-muted-foreground">{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
