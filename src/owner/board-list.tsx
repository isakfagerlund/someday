import { ArrowRightIcon, PlusIcon } from "../components/icons"
import { Logo } from "../components/logo"
import type { BoardSummary } from "../db/boards"

export function BoardList({ boards, onCreate }: { boards: BoardSummary[]; onCreate: () => void }) {
  return (
    <section className="mx-auto max-w-2xl pb-16" aria-labelledby="boards-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="font-medium" id="boards-heading">Your boards</h2>
        <button
          className="pressable focus-ring inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-muted hover:text-text"
          id="create-board"
          type="button"
          onClick={onCreate}
        >
          <PlusIcon className="size-4 fill-current" /> Create a new board
        </button>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {boards.map((board) => (
          <li key={board.id}>
            <a
              className="group focus-ring flex items-center gap-4 rounded-lg py-4 no-underline"
              href={`/${encodeURIComponent(board.slug)}`}
            >
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface text-xl text-muted">
                {board.imageKey ? (
                  <img
                    className="size-full object-cover transition-transform duration-[220ms] ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    src={`/images/${encodeURIComponent(board.imageKey)}/360.webp`}
                    width={64}
                    height={64}
                    alt=""
                    loading="lazy"
                  />
                ) : <span aria-hidden="true"><Logo /></span>}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate font-medium">{board.name}</span>
                <span className="text-sm text-muted">
                  {board.productCount === 0 ? "No items yet" : `${board.productCount} ${board.productCount === 1 ? "item" : "items"}`}
                </span>
              </span>
              <ArrowRightIcon className="mr-1 size-5 shrink-0 fill-current text-muted group-hover:text-text" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
