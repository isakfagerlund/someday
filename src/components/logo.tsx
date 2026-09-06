interface LogoProps {
  className?: string
  showName?: boolean
}

export function Logo({ className = "", showName = false }: LogoProps) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}>
      <img className="size-[1em]" src="/logo.svg" alt="" />
      {showName && <span>someday</span>}
    </span>
  )
}
