import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Dialog } from "@base-ui/react/dialog"
import { useState } from "react"

import { EditIcon } from "../components/icons"
import type { Board } from "../db/boards"
import { boardSlugFromName } from "../domain/board"
import { deleteBoard, renameBoard } from "../server/boards"
import {
  backdropClass,
  dangerButtonClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  inputClass,
  labelClass,
  popupClass,
  primaryButtonClass,
} from "./ui"

export function EditBoardButton({ board }: { board: Board }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="pressable focus-ring grid size-11 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-muted hover:text-text"
        aria-label={`Edit ${board.name}`}
      >
        <EditIcon className="size-5 fill-current" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={`${popupClass} w-[min(100%-2rem,30rem)]`}>
          {open && <EditBoardForm board={board} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditBoardForm({ board }: { board: Board }) {
  const [name, setName] = useState(board.name)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const slug = boardSlugFromName(name)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setError(null)
    setSaving(true)

    try {
      await renameBoard({ data: { boardId: board.id, name } })
      location.reload()
    } catch (caught) {
      setError(errorMessage(caught, "The board could not be renamed."))
      setSaving(false)
    }
  }

  async function remove() {
    setError(null)
    setSaving(true)

    try {
      await deleteBoard({ data: { boardId: board.id } })
      location.reload()
    } catch (caught) {
      setError(errorMessage(caught, "The board could not be deleted."))
      setSaving(false)
    }
  }

  return (
    <form className="flex flex-col gap-2 p-6" onSubmit={save}>
      <DialogHeading className="mb-4" closeLabel="Close edit board dialog">
        Edit board
      </DialogHeading>
      <label className={labelClass} htmlFor="edit-board-name">Board name</label>
      <input
        className={`${inputClass} rounded-lg`}
        id="edit-board-name"
        name="name"
        maxLength={80}
        aria-describedby="edit-board-url"
        autoFocus
        required
        disabled={saving}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <p className="mt-2 text-sm break-all text-muted" id="edit-board-url">
        someday.fyi/{slug || "your-board"}
      </p>
      <ErrorMessage message={error} />
      <div className="mt-6 flex items-center justify-between gap-3">
        <DeleteBoardButton onConfirm={remove} disabled={saving} />
        <button className={primaryButtonClass} type="submit" disabled={saving || !slug}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  )
}

function DeleteBoardButton({ onConfirm, disabled }: { onConfirm: () => void; disabled: boolean }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className={dangerButtonClass} disabled={disabled}>
        Delete
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdropClass} />
        <AlertDialog.Popup className={`${popupClass} flex w-[min(100%-2rem,24rem)] flex-col gap-2 p-6`}>
          <AlertDialog.Title render={<h2 />}>Delete this board?</AlertDialog.Title>
          <AlertDialog.Description className="text-muted">
            The board and everything on it disappear from someday.
          </AlertDialog.Description>
          <div className="mt-6 flex items-center justify-end gap-3">
            <AlertDialog.Close className={dangerButtonClass}>Cancel</AlertDialog.Close>
            <AlertDialog.Close className={primaryButtonClass} onClick={onConfirm}>
              Delete
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
