import { cn } from "@/lib/utils"

export function PulseLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:size-11">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-7"
          role="img"
          aria-label="Pulse heart rate symbol"
        >
          <path
            d="M20.5 8.5c0 4.5-6.2 8.6-8.5 10.5C9.7 17.1 3.5 13 3.5 8.5A4 4 0 0 1 12 6.2 4 4 0 0 1 20.5 8.5Z"
            fill="currentColor"
            opacity="0.22"
          />
          <path
            d="M3 12.5h3.4l1.5-3.3 2.7 6.6 2-4.1 1.2 2.3H21"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-bold tracking-tight text-foreground sm:text-lg">
          Pulse <span className="text-primary">Specialised</span> Hospital
        </p>
        <p className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
          পালস স্পেশালাইজড হাসপাতাল
        </p>
      </div>
    </div>
  )
}
