import type { ReactNode } from "react"

export function LandingIntro({
  account,
  action,
}: {
  account?: ReactNode
  action: ReactNode
}) {
  return (
    <>
      <header className="flex h-24 items-center justify-between gap-6 md:h-28">
        <a className="focus-ring text-2xl font-[600] tracking-[-0.065em] no-underline" href="/" aria-label="Someday home">
          someday<span className="text-muted">.</span>
        </a>
        {account}
      </header>
      <section className="flex flex-col items-center pb-12 pt-10 text-center md:pb-16 md:pt-14" aria-labelledby="intro-heading">
        <p className="mb-5 text-xs font-medium tracking-[0.16em] uppercase text-muted">A home for your wishlist</p>
        <h1 id="intro-heading" className="max-w-3xl text-[clamp(3.25rem,7vw,5.5rem)] font-[500] leading-[1.02] tracking-[-0.065em]">
          For everything you’ll<br className="hidden md:block" /> come back to.
        </h1>
        <p className="mt-6 max-w-96 text-base leading-relaxed text-muted md:text-lg">
          The lamp. The jacket. That very good chair.<br className="hidden md:block" /> Save your finds in one simple board.
        </p>
        <div className="mt-8">{action}</div>
      </section>
    </>
  )
}
