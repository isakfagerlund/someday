import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start"
import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

import { LandingIntro } from "../components/landing-intro"
import type { Board } from "../db/boards"
import { boardSlugFromName } from "../domain/board"
import { createBoard } from "../server/boards"
import {
  backdropClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  inputClass,
  labelClass,
  popupClass,
  primaryButtonClass,
} from "./ui"

interface HomeAccountProps {
  clerkPublishableKey: string
  ownerBoard?: Board
  signedIn: boolean
}

export default function HomeAccount({
  clerkPublishableKey,
  ownerBoard,
  signedIn,
}: HomeAccountProps) {
  const [creating, setCreating] = useState(signedIn && !ownerBoard)
  const boardPath = ownerBoard ? `/${encodeURIComponent(ownerBoard.slug)}` : null
  const actionClass = `${primaryButtonClass} inline-flex min-h-12 items-center gap-3 no-underline`

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <LandingIntro
        account={signedIn ? (
          <nav className="flex items-center gap-5" aria-label="Your account">
            {boardPath && <a className="focus-ring flex min-h-11 items-center text-sm font-medium no-underline" href={boardPath}>My board</a>}
            <UserButton />
          </nav>
        ) : (
          <SignInButton mode="modal" forceRedirectUrl="/auth/redirect">
            <button className="pressable focus-ring min-h-11 cursor-pointer px-2 text-sm font-medium hover:opacity-70" type="button">Sign in</button>
          </SignInButton>
        )}
        action={boardPath ? (
          <a className={actionClass} href={boardPath}>Go to my board <span aria-hidden="true">↗</span></a>
        ) : signedIn ? (
          <button className={actionClass} type="button" onClick={() => setCreating(true)}>Create your board <span aria-hidden="true">↗</span></button>
        ) : (
          <SignUpButton mode="modal" forceRedirectUrl="/auth/redirect">
            <button className={actionClass} type="button">Create your board <span aria-hidden="true">↗</span></button>
          </SignUpButton>
        )}
      />
      {signedIn && !ownerBoard && (
        <CreateBoardDialog open={creating} onOpenChange={setCreating} />
      )}
    </ClerkProvider>
  )
}

function CreateBoardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const slug = boardSlugFromName(name)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError(null)
    setSaving(true)

    try {
      const board = await createBoard({ data: { name } })
      location.assign(`/${encodeURIComponent(board.slug)}`)
    } catch (caught) {
      setError(errorMessage(caught, "The board could not be created."))
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={`${popupClass} w-[min(100%-2rem,30rem)]`}>
          <form className="flex flex-col gap-2 p-6" onSubmit={submit} aria-busy={saving}>
            <DialogHeading className="mb-2" closeLabel="Close">Make a little room for someday.</DialogHeading>
            <Dialog.Description className="mb-4 text-sm text-muted">
              Give your board a name. Your first find comes next.
            </Dialog.Description>
            <label className={labelClass} htmlFor="board-name">Board name</label>
            <input
              className={`${inputClass} rounded-lg`}
              id="board-name"
              name="name"
              placeholder="My someday list"
              maxLength={80}
              aria-describedby="board-url-preview board-sharing"
              autoFocus
              required
              disabled={saving}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-xs leading-relaxed text-muted" id="board-url-preview">
              someday.fyi/<span className="text-text [overflow-wrap:anywhere]">{slug || "your-board"}</span>
              {slug && " · We'll adjust the link if it's already taken."}
            </p>
            <p className="mt-3 text-sm text-muted" id="board-sharing">Your board is public. Anyone with the link can see your finds.</p>
            <ErrorMessage message={error} />
            <button className={`${primaryButtonClass} mt-5 min-h-12`} type="submit" disabled={saving || !slug}>
              {saving ? "Creating your board…" : "Create board"}
            </button>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
