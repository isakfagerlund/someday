import { ClerkProvider, SignInButton, UserButton } from "@clerk/tanstack-react-start"
import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

import type { Board } from "../db/boards"
import { reservedBoardSlugs, uniqueBoardSlug } from "../domain/board"
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
  boards: Board[]
  clerkPublishableKey: string
  ownerBoard?: Board
  signedIn: boolean
  userName: string | null
}

// Sign-in, the owner's link to their board, and first-run board creation.
// The home page already loaded Clerk for everyone before the migration.
export default function HomeAccount({
  boards,
  clerkPublishableKey,
  ownerBoard,
  signedIn,
  userName,
}: HomeAccountProps) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      {!signedIn ? (
        <SignInButton mode="modal" forceRedirectUrl="/auth/redirect">
          <button
            className="pressable focus-ring cursor-pointer rounded-pill border-0 bg-text px-6 py-[0.65rem] text-bg hover:opacity-[0.82]"
            type="button"
          >
            Sign in
          </button>
        </SignInButton>
      ) : (
        <div className="flex items-center gap-4">
          {ownerBoard ? (
            <a
              className="focus-ring font-[550] no-underline"
              href={`/${encodeURIComponent(ownerBoard.slug)}`}
            >
              {userName}
            </a>
          ) : (
            <span className="font-[550]">{userName}</span>
          )}
          <UserButton />
        </div>
      )}
      {signedIn && !ownerBoard && (
        <CreateBoardDialog takenSlugs={boards.map((board) => board.slug)} />
      )}
    </ClerkProvider>
  )
}

function CreateBoardDialog({ takenSlugs }: { takenSlugs: string[] }) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const slug = name.trim()
    ? uniqueBoardSlug(name, [...reservedBoardSlugs, ...takenSlugs])
    : ""

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    try {
      const board = await createBoard({ data: { name } })

      location.assign(`/${encodeURIComponent(board.slug)}`)
    } catch (caught) {
      setError(errorMessage(caught, "The board could not be created."))
    }
  }

  return (
    <Dialog.Root open disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={`${popupClass} w-[min(100%-2rem,30rem)]`}>
          <form className="flex flex-col gap-2 p-6" onSubmit={submit}>
            <DialogHeading className="mb-4">Create your board</DialogHeading>
            <p className="mb-2 text-muted">
              Choose a name. We'll use it to make your board's URL.
            </p>
            <label className={labelClass} htmlFor="board-name">
              Board name
            </label>
            <input
              className={inputClass}
              id="board-name"
              name="name"
              maxLength={80}
              aria-describedby="board-url-preview"
              autoFocus
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <p className="text-sm text-muted" id="board-url-preview">
              Your board will be at{" "}
              <span className="text-text [overflow-wrap:anywhere]">
                https://someday.fyi/<strong>{slug || "your-board"}</strong>
              </span>
            </p>
            <ErrorMessage message={error} />
            <div className="mt-6 flex items-center justify-end gap-3">
              <button className={primaryButtonClass} type="submit">
                Create board
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
