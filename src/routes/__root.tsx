import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router"

import styles from "../styles.css?url"

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "color-scheme", content: "light dark" },
      { name: "description", content: "Everything you want, collected for you." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "someday" },
      { property: "og:title", content: "someday · Maybe someday" },
      { property: "og:description", content: "Everything you want, collected for you." },
      { property: "og:image", content: "https://someday.fyi/social-card.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "The someday logo and wordmark" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "someday · Maybe someday" },
      { name: "twitter:description", content: "Everything you want, collected for you." },
      { name: "twitter:image", content: "https://someday.fyi/social-card.png" },
      { name: "twitter:image:alt", content: "The someday logo and wordmark" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "icon", href: "/logo.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png", sizes: "180x180" },
      { rel: "manifest", href: "/site.webmanifest" },
    ],
  }),
  component: RootLayout,
  notFoundComponent: () => <p className="wrapper py-12">Not found</p>,
})

function RootLayout() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <meta name="theme-color" content="#f2f2f2" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#171714" media="(prefers-color-scheme: dark)" />
      </head>
      <body>
        <Outlet />
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => {
              throw new Error("Sentry Test Error")
            }}
          >
            Test Sentry
          </button>
        )}
        <Scripts />
      </body>
    </html>
  )
}
