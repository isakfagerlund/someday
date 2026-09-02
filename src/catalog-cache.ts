// Workers Cache ignores zone Cache Rules, so cookies must vary the cache entry.
// Otherwise signed-in users receive the cached anonymous page.
const publicHtmlCacheHeaders = {
  "cache-control": "public, max-age=0, must-revalidate",
  "cloudflare-cdn-cache-control":
    "public, max-age=86400, stale-while-revalidate=604800",
  vary: "cookie",
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
