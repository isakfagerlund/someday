import { cloudflare } from "@cloudflare/vite-plugin"
import { sentryTanstackStart } from "@sentry/tanstackstart-react/vite"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
    sentryTanstackStart({
      org: "irewardhealth",
      project: "someday",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      autoInstrumentMiddleware: false,
      sourcemaps: {
        disable: !process.env.SENTRY_AUTH_TOKEN,
        filesToDeleteAfterUpload: ["./dist/**/*.map"],
      },
    }),
  ],
})
