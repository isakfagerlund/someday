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
      { title: "someday · A home for your wishlist" },
      {
        name: "description",
        content: "Save the things you find online to your own little board. Paste a product link, choose an image, and come back to it someday.",
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
