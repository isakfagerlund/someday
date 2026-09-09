import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { privateHtmlCacheHeaders } from "../catalog-cache"
import { ChevronLeftIcon } from "../components/icons"
import { loadHome } from "../server/pages"

const QuickSave = lazy(() => import("../owner/quick-save"))

export const Route = createFileRoute("/save")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: typeof search.url === "string" ? search.url : undefined,
  }),
  loader: () => loadHome(),
  headers: () => ({ ...privateHtmlCacheHeaders, "referrer-policy": "no-referrer" }),
  head: () => ({ meta: [
    { title: "Save to someday" },
    { name: "robots", content: "noindex" },
  ] }),
  component: SavePage,
})

function SavePage() {
  const data = Route.useLoaderData()
  const { url } = Route.useSearch()

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col gap-8 px-6 py-12 sm:py-20">
      <a className="focus-ring inline-flex min-h-11 w-fit items-center gap-1 text-sm text-muted hover:text-text" href="/"><ChevronLeftIcon className="size-4 fill-current" /> someday</a>
      <Suspense fallback={<p role="status">Getting ready…</p>}>
        <QuickSave key={url} {...data} url={url} />
      </Suspense>
    </main>
  )
}
