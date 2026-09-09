import { ClerkProvider, SignInButton } from "@clerk/tanstack-react-start"
import { useState } from "react"

import type { BoardSummary } from "../db/boards"
import { validateProductUrl } from "../import/product-url"
import { AddProductButton } from "./import-product-dialog"
import { CreateBoardDialog } from "./create-board-dialog"
import { SaveSetup } from "./save-setup"
import { primaryButtonClass } from "./ui"

export default function QuickSave({ url, signedIn, ownerBoards, clerkPublishableKey }: {
  url?: string
  signedIn: boolean
  ownerBoards: BoardSummary[]
  clerkPublishableKey: string
}) {
  const [board, setBoard] = useState(ownerBoards.length === 1 ? ownerBoards[0] : undefined)
  const [creating, setCreating] = useState(false)
  if (url === undefined) return <SaveSetup />

  let productUrl: URL
  try {
    productUrl = validateProductUrl(url)
  } catch {
    return (
      <>
        <h1 className="text-3xl font-medium">This link cannot be saved</h1>
        <p className="text-muted">Share a public product page from your browser, or copy its link and add it from your board.</p>
        <a className="focus-ring min-h-11 content-center underline underline-offset-4" href="/">Go to your boards</a>
      </>
    )
  }

  const returnTo = `/save?${new URLSearchParams({ url })}`

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium">Save to someday</h1>
        <p className="break-all text-muted">{productUrl.hostname}</p>
      </div>
      {!signedIn ? (
        <div className="flex flex-col items-start gap-4">
          <p>Sign in to save this product. Your link will be waiting.</p>
          <SignInButton mode="modal" forceRedirectUrl={returnTo}>
            <button className={`${primaryButtonClass} min-h-12`} type="button">Sign in to save</button>
          </SignInButton>
        </div>
      ) : ownerBoards.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p>Create a board for your first find.</p>
          <button className={`${primaryButtonClass} min-h-12`} id="create-board" type="button" onClick={() => setCreating(true)}>Create your board</button>
          <CreateBoardDialog open={creating} onOpenChange={setCreating} returnTo={returnTo} />
        </div>
      ) : board ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <p>Adding to <span className="font-medium">{board.name}</span></p>
            <AddProductButton
              key={board.id}
              boardId={board.id}
              initialUrl={url}
              onAdded={async () => { location.assign(`/${encodeURIComponent(board.slug)}`) }}
              onExisting={async (product) => {
                location.assign(`/${encodeURIComponent(board.slug)}${product.status === "owned" ? "?view=owned" : ""}`)
              }}
            />
          </div>
          {ownerBoards.length > 1 && <button className="focus-ring min-h-11 w-fit cursor-pointer text-sm underline underline-offset-4" type="button" onClick={() => setBoard(undefined)}>Choose another board</button>}
          <a className="focus-ring min-h-11 w-fit content-center text-sm text-muted underline underline-offset-4" href={`/${encodeURIComponent(board.slug)}`}>Go to board</a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-muted">Choose a board for this product.</p>
          {ownerBoards.map((item) => (
            <button className="pressable focus-ring min-h-14 cursor-pointer rounded-2xl border border-border bg-surface px-5 py-3 text-left font-medium hover:bg-bg" key={item.id} type="button" onClick={() => setBoard(item)}>{item.name}</button>
          ))}
        </div>
      )}
    </ClerkProvider>
  )
}
