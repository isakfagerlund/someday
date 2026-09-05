import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { homeCacheHeaders, privateHtmlCacheHeaders } from "../catalog-cache"
import { loadHome } from "../server/pages"

const HomeAccount = lazy(() => import("../owner/home-account"))

export const Route = createFileRoute("/")({
  loader: () => loadHome(),
  headers: ({ loaderData }) =>
    loaderData?.signedIn ? privateHtmlCacheHeaders : homeCacheHeaders,
  head: () => ({ meta: [{ title: "someday" }] }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()

  return (
    <main className="wrapper flex flex-col gap-8 py-[clamp(3rem,9vw,7rem)]">
      <div className="flex items-center justify-between gap-4">
        <h1>someday</h1>
        <Suspense>
          <HomeAccount {...data} />
        </Suspense>
      </div>
      <nav aria-label="Public boards">
        <ul className="grid gap-3" role="list">
          {data.boards.map((board) => (
            <li key={board.id}>
              <a
                className="focus-ring block rounded-xl bg-surface p-6 text-xl font-[550] no-underline shadow-surface transition-[box-shadow,transform] duration-[140ms] ease-out hover:shadow-surface-hover active:scale-[0.96] motion-reduce:transition-none"
                href={`/${encodeURIComponent(board.slug)}`}
              >
                {board.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}
