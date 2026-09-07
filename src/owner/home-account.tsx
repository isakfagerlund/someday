import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start"
import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

import { ArrowRightIcon, PlusIcon } from "../components/icons"
import { LandingIntro } from "../components/landing-intro"
import type { Board } from "../db/boards"
import { boardSlugFromName } from "../domain/board"
import { createBoard } from "../server/boards"
import { MorphDialog } from "./morph-dialog"
import {
  backdropClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  inputClass,
  labelClass,
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
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonAvatarBox: { display: "none" },
                userButtonOuterIdentifier: "text-sm font-medium text-text",
                userButtonTrigger: "pressable focus-ring min-h-11 cursor-pointer px-2 hover:opacity-70",
              },
            }}
          />
        ) : (
          <SignInButton mode="modal" forceRedirectUrl="/auth/redirect">
            <button className="pressable focus-ring min-h-11 cursor-pointer px-2 text-sm font-medium hover:opacity-70" type="button">Sign in</button>
          </SignInButton>
        )}
        action={boardPath ? (
          <a className={actionClass} href={boardPath}>Go to my board <ArrowRightIcon className="size-5 fill-current" /></a>
        ) : signedIn ? (
          <button className={actionClass} type="button" onClick={() => setCreating(true)}>Create your board <PlusIcon className="size-5 fill-current" /></button>
        ) : (
          <SignUpButton mode="modal" forceRedirectUrl="/auth/redirect">
            <button className={actionClass} type="button">Create your board <PlusIcon className="size-5 fill-current" /></button>
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
    <Dialog.Root open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next) }}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <MorphDialog phase={saving ? "finding" : "url"}>
          <form className="flex flex-col gap-2" onSubmit={submit} aria-busy={saving}>
            <div className={saving ? "sr-only" : ""}>
              <DialogHeading className="mb-2" closeLabel={saving ? undefined : "Close"}>Create board</DialogHeading>
            </div>
            {saving ? (
              <div className="flex items-center gap-4" role="status">
                <span className="import-spinner shrink-0" aria-hidden="true" />
                <p className="font-medium">Creating your board…</p>
              </div>
            ) : (
              <>
                <label className={labelClass} htmlFor="board-name">Board name</label>
                <input
                  className={`${inputClass} rounded-lg`}
                  id="board-name"
                  name="name"
                  placeholder="My someday list"
                  maxLength={80}
                  aria-describedby="board-sharing"
                  autoFocus
                  required
                  disabled={saving}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <p className="mt-2 text-sm text-muted" id="board-sharing">Anyone with the link can view your board.</p>
                <ErrorMessage message={error} />
                <button className={`${primaryButtonClass} mt-5 min-h-12`} type="submit" disabled={saving || !slug}>
                  Create board
                </button>
              </>
            )}
          </form>
        </MorphDialog>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
