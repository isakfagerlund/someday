import { Menu } from "@base-ui/react/menu"
import { useRouter } from "@tanstack/react-router"

import { DotsThreeIcon } from "../components/icons"
import type { Category, ProductView } from "../domain/product"

export const ownedNavigationOptions = [
  "Quiet text action",
  "Collection dropdown",
  "Overflow menu",
  "Simple text tabs",
] as const

export type OwnedNavigationOption = typeof ownedNavigationOptions[number]

const buttonClass = "focus-ring min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-sm text-sm text-muted hover:text-text"

export function OwnedToggle({ boardSlug, category, view, option }: {
  boardSlug: string
  category: Category | null
  view: ProductView
  option: OwnedNavigationOption
}) {
  const router = useRouter()
  const owned = view === "owned"
  const navigate = (next: ProductView) => void router.navigate({
    to: "/$boardSlug",
    params: { boardSlug },
    search: { category: category ?? undefined, view: next },
    resetScroll: false,
  })

  if (option === "Quiet text action") return (
    <button type="button" id="owned-toggle" className={buttonClass} onClick={() => navigate(owned ? undefined : "owned")}>
      {owned ? "← Back to wishlist" : "View owned →"}
    </button>
  )

  if (option === "Simple text tabs") return (
    <nav aria-label="Product collection" className="flex shrink-0 gap-4">
      {([undefined, "owned"] as const).map((value) => (
        <button key={value ?? "wishlist"} type="button" id={view === value ? "owned-toggle" : undefined}
          aria-pressed={view === value}
          className={`${buttonClass} border-b-2 border-transparent aria-pressed:border-text aria-pressed:text-text`}
          onClick={() => navigate(value)}>
          {value === "owned" ? "Owned" : "Wishlist"}
        </button>
      ))}
    </nav>
  )

  const overflow = option === "Overflow menu"
  return (
    <Menu.Root>
      <Menu.Trigger id="owned-toggle" aria-label={overflow ? "Board options" : undefined}
        className={`${buttonClass} ${overflow ? "grid size-11 place-items-center rounded-full" : "flex items-center gap-2"}`}>
        {overflow ? <DotsThreeIcon className="size-5 fill-current" /> : <>{owned ? "Owned" : "Wishlist"}<span aria-hidden="true">⌄</span></>}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-30 outline-none">
          <Menu.Popup className="min-w-44 rounded-xl border border-border bg-surface p-1 text-text shadow-surface-hover outline-none">
            {(overflow ? [owned ? undefined : "owned"] : [undefined, "owned"] as const).map((value) => (
              <Menu.Item key={value ?? "wishlist"} onClick={() => navigate(value as ProductView)}
                className="flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-bg">
                {overflow ? (owned ? "Back to wishlist" : "View owned") : (value === "owned" ? "Owned" : "Wishlist")}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

// Temporary owner-only comparison tool. Remove once a direction is chosen.
export function OwnedNavigationDevTool({ option, onChange }: {
  option: OwnedNavigationOption
  onChange: (option: OwnedNavigationOption) => void
}) {
  return (
    <aside aria-label="Owned navigation design preview" className="fixed inset-x-3 bottom-3 z-30 mx-auto flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1 text-xs text-muted shadow-surface-hover">
      <label htmlFor="owned-design">Dev</label>
      <select id="owned-design" value={option} onChange={(event) => onChange(event.target.value as OwnedNavigationOption)}
        className="focus-ring min-h-11 min-w-0 rounded-sm bg-surface text-sm text-text">
        {ownedNavigationOptions.map((name, index) => <option key={name} value={name}>{index + 1}. {name}</option>)}
      </select>
      <button type="button" className="focus-ring min-h-11 cursor-pointer rounded-sm px-2 text-text" onClick={() => onChange(ownedNavigationOptions[(ownedNavigationOptions.indexOf(option) + 1) % ownedNavigationOptions.length])}>Next →</button>
    </aside>
  )
}
