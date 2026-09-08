import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

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

export function CreateBoardDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
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
        <MorphDialog phase={saving ? "finding" : "url"} finalFocus={() => document.getElementById("create-board")}>
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
                  aria-describedby="board-url"
                  autoFocus
                  required
                  disabled={saving}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <p className="mt-2 text-sm break-all text-muted" id="board-url">someday.fyi/{slug || "your-board"}</p>
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
