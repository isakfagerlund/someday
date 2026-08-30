import { z } from "zod"

import { purgeHomeCache } from "../catalog-cache"
import {
  getBoardByOwnerId,
  insertBoard,
  listBoards,
} from "../db/boards"
import { boardSlugFromName, uniqueBoardSlug } from "../domain/board"

const createBoardInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

function redirect(request: Request, pathname: string) {
  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: new URL(pathname, request.url).href,
    },
  })
}

export async function handleCreateBoard(
  request: Request,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const ownedBoard = await getBoardByOwnerId(env.DB, userId)

  if (ownedBoard) {
    return redirect(request, `/${encodeURIComponent(ownedBoard.slug)}`)
  }

  let form: FormData

  try {
    form = await request.formData()
  } catch {
    return redirect(request, "/?board=invalid")
  }

  const result = createBoardInputSchema.safeParse({ name: form.get("name") })

  if (!result.success || !boardSlugFromName(result.data.name)) {
    return redirect(request, "/?board=invalid")
  }

  const boards = await listBoards(env.DB)
  const slug = uniqueBoardSlug(
    result.data.name,
    boards.map((board) => board.slug),
  )
  const board = await insertBoard(env.DB, {
    id: crypto.randomUUID(),
    name: result.data.name,
    slug,
    clerkOwnerId: userId,
  })

  await purgeHomeCache(ctx)

  return redirect(request, `/${encodeURIComponent(board.slug)}`)
}
