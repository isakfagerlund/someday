import { createFileRoute } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import { homeCacheHeaders, privateHtmlCacheHeaders } from "../catalog-cache"
import { LandingIntro } from "../components/landing-intro"
import { loadHome } from "../server/pages"

const HomeAccount = lazy(() => import("../owner/home-account"))

export const Route = createFileRoute("/")({
  loader: () => loadHome(),
  headers: ({ loaderData }) =>
    loaderData?.signedIn ? privateHtmlCacheHeaders : homeCacheHeaders,
  head: () => ({
    meta: [
      { title: "someday" },
      {
        name: "description",
        content: "Everything you want, collected for you.",
      },
    ],
  }),
  component: HomePage,
})

function HomePage() {
  const data = Route.useLoaderData()

  return (
    <main className="wrapper min-h-svh">
      <Suspense fallback={<LandingIntro action={<span className="inline-block h-12" />} />}>
        <HomeAccount {...data} />
      </Suspense>
    </main>
  )
}
