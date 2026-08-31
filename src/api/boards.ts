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

function invalidBoardResponse(request: Request, jsonRequest: boolean) {
  return jsonRequest
    ? Response.json(
        { error: "Enter a name with at least one letter or number." },
        { status: 400, headers: { "cache-control": "no-store" } },
      )
    : redirect(request, "/?board=invalid")
}

function boardResponse(request: Request, slug: string, jsonRequest: boolean) {
  return jsonRequest
    ? Response.json(
        { slug },
        { status: 201, headers: { "cache-control": "no-store" } },
      )
    : redirect(request, `/${encodeURIComponent(slug)}`)
}

export async function handleCreateBoard(
  request: Request,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const jsonRequest = request.headers
    .get("content-type")
    ?.includes("application/json") ?? false
  const ownedBoard = await getBoardByOwnerId(env.DB, userId)

  if (ownedBoard) {
    return boardResponse(request, ownedBoard.slug, jsonRequest)
  }

  let input: unknown

  try {
    input = jsonRequest
      ? await request.json()
      : { name: (await request.formData()).get("name") }
  } catch {
    return invalidBoardResponse(request, jsonRequest)
  }

  const result = createBoardInputSchema.safeParse(input)

  if (!result.success || !boardSlugFromName(result.data.name)) {
    return invalidBoardResponse(request, jsonRequest)
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

  return boardResponse(request, board.slug, jsonRequest)
}
