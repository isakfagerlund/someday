export const catalogCacheHeaders = {
  "cache-control": "public, max-age=0, must-revalidate",
  "cloudflare-cdn-cache-control":
    "public, max-age=86400, stale-while-revalidate=604800",
  "cache-tag": "catalog",
} as const

export async function purgeCatalogCache(ctx: ExecutionContext) {
  if (!ctx.cache) return

  const result = await ctx.cache.purge({ tags: ["catalog"] })

  if (!result.success) {
    console.error(
      JSON.stringify({
        message: "failed to purge catalog cache",
        errors: result.errors,
      }),
    )
  }
}
