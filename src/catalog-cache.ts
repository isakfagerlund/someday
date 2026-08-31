const publicHtmlCacheHeaders = {
  "cache-control": "public, max-age=0, must-revalidate",
  "cloudflare-cdn-cache-control":
    "public, max-age=86400, stale-while-revalidate=604800",
} as const

export const privateHtmlCacheHeaders = {
  "cache-control": "private, no-store",
} as const

export const homeCacheHeaders = {
  ...publicHtmlCacheHeaders,
  "cache-tag": "boards",
} as const

export function boardCacheHeaders(boardId: string) {
  return {
    ...publicHtmlCacheHeaders,
    "cache-tag": `board-${boardId}`,
  } as const
}

export async function purgeBoardCache(
  ctx: ExecutionContext,
  boardId: string,
) {
  await purgeCacheTags(ctx, [`board-${boardId}`])
}

export async function purgeHomeCache(ctx: ExecutionContext) {
  await purgeCacheTags(ctx, ["boards"])
}

async function purgeCacheTags(ctx: ExecutionContext, tags: string[]) {
  if (!ctx.cache) return

  const result = await ctx.cache.purge({ tags })

  if (!result.success) {
    console.error(
      JSON.stringify({
        message: "failed to purge catalog cache",
        errors: result.errors,
        tags,
      }),
    )
  }
}
