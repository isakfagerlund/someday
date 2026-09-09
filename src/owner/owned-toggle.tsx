import { useRouter } from "@tanstack/react-router"

import type { Category, ProductView } from "../domain/product"

export function OwnedToggle({ boardSlug, category, view }: {
  boardSlug: string
  category: Category | null
  view: ProductView
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      role="switch"
      id="owned-toggle"
      aria-checked={view === "owned"}
      className="group/toggle focus-ring flex shrink-0 min-h-11 cursor-pointer items-center gap-2.5 rounded-lg text-sm text-muted hover:text-text"
      onClick={() => void router.navigate({
        to: "/$boardSlug",
        params: { boardSlug },
        search: { category: category ?? undefined, view: view === "owned" ? undefined : "owned" },
        resetScroll: false,
      })}
    >
      <span aria-hidden="true" className="relative h-5 w-9 rounded-full bg-border transition-colors duration-150 group-aria-checked/toggle:bg-text motion-reduce:transition-none">
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-surface shadow-sm transition-transform duration-150 group-aria-checked/toggle:translate-x-4 group-aria-checked/toggle:bg-bg motion-reduce:transition-none" />
      </span>
      Owned
    </button>
  )
}
