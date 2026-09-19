import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { privateHtmlCacheHeaders } from "../catalog-cache"
import { ChevronLeftIcon } from "../components/icons"
import { findSharedUrl } from "../import/product-url"
import { loadHome } from "../server/pages"

const QuickSave = lazy(() => import("../owner/quick-save"))

const asText = (value: unknown) => (typeof value === "string" ? value : undefined)

export const Route = createFileRoute("/save")({
  // The Chrome extension and the iPhone Shortcut send url. The Android share
  // sheet may instead put the link inside text or title.
  validateSearch: (search: Record<string, unknown>) => ({
    url: asText(search.url) ?? findSharedUrl(asText(search.text), asText(search.title)),
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
