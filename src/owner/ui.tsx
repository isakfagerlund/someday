import { Dialog } from "@base-ui/react/dialog"
import type { ReactNode } from "react"

import { CloseIcon } from "../components/icons"

// Shared building blocks for the owner-only dialogs. Everything in src/owner
// is loaded on demand, so none of this reaches anonymous visitors.

export const backdropClass =
  "fixed inset-0 bg-[rgb(0_0_0/0.32)] backdrop-blur-[10px] transition-opacity duration-[160ms] ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"

export const popupClass =
  "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface text-text shadow-dialog outline-none transition-[opacity,transform,translate] duration-[160ms] ease-out data-[starting-style]:translate-y-2 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none"

export const labelClass = "mt-2 text-sm font-semibold"

export const inputClass =
  "focus-ring w-full border border-border bg-bg px-3 py-[0.65rem] text-text"

export const primaryButtonClass =
  "pressable focus-ring cursor-pointer rounded-pill border border-text bg-text px-6 py-[0.65rem] text-bg hover:opacity-[0.82] disabled:cursor-wait disabled:opacity-65"

export const dangerButtonClass =
  "pressable focus-ring min-h-11 cursor-pointer border-0 bg-transparent px-2 text-danger hover:opacity-[0.72]"

export const errorClass = "mt-2 text-sm text-danger"

export function DialogHeading({
  children,
  closeLabel,
  className = "",
}: {
  children: ReactNode
  closeLabel?: string
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <Dialog.Title render={<h2 />}>{children}</Dialog.Title>
      {closeLabel && (
        <Dialog.Close
          className="focus-ring grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted transition-[color,background-color,transform] duration-[140ms] ease-out hover:bg-bg hover:text-text active:scale-[0.96]"
          aria-label={closeLabel}
        >
          <CloseIcon className="size-5 fill-current" />
        </Dialog.Close>
      )}
    </div>
  )
}

export function ErrorMessage({ message }: { message: string | null }) {
  return (
    <p className={errorClass} role="alert" hidden={!message}>
      {message}
    </p>
  )
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
