import { ClerkProvider, SignInButton, SignUpButton, UserButton } from "@clerk/tanstack-react-start"
import { useState } from "react"

import { ArrowRightIcon, PlusIcon } from "../components/icons"
import { LandingIntro } from "../components/landing-intro"
import type { BoardSummary } from "../db/boards"
import { BoardList } from "./board-list"
import { CreateBoardDialog } from "./create-board-dialog"
import { primaryButtonClass } from "./ui"

interface HomeAccountProps {
  clerkPublishableKey: string
  ownerBoards: BoardSummary[]
  signedIn: boolean
}

export default function HomeAccount({
  clerkPublishableKey,
  ownerBoards,
  signedIn,
}: HomeAccountProps) {
  const [creating, setCreating] = useState(signedIn && ownerBoards.length === 0)
  const ownerBoard = ownerBoards.length === 1 ? ownerBoards[0] : undefined
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
        action={ownerBoards.length > 1 ? null : boardPath ? (
          <div className="flex flex-col items-center gap-3">
            <a className={actionClass} href={boardPath}>Go to my board <ArrowRightIcon className="size-5 fill-current" /></a>
            <button className="pressable focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm text-muted hover:text-text" id="create-board" type="button" onClick={() => setCreating(true)}>
              <PlusIcon className="size-4 fill-current" /> Create a new board
            </button>
          </div>
        ) : signedIn ? (
          <button className={actionClass} id="create-board" type="button" onClick={() => setCreating(true)}>Create your board <PlusIcon className="size-5 fill-current" /></button>
        ) : (
          <SignUpButton mode="modal" forceRedirectUrl="/auth/redirect">
            <button className={actionClass} type="button">Create your board <PlusIcon className="size-5 fill-current" /></button>
          </SignUpButton>
        )}
      />
      {signedIn && ownerBoards.length > 1 && (
        <BoardList boards={ownerBoards} onCreate={() => setCreating(true)} />
      )}
      {signedIn && (
        <CreateBoardDialog open={creating} onOpenChange={setCreating} />
      )}
    </ClerkProvider>
  )
}
