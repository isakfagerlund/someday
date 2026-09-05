# Moving someday to TanStack Start

Research notes and a plan of action. Written 2026-09-02.

## The bar for this PR

The app must look the same when this lands. Not "refreshed", not "cleaned up while I was in there". Same layout, same spacing, same colors, same type, same motion. The only thing that changes is the code behind it.

Everything else in this document is in service of that. If a step tempts you into a redesign, split it into a second PR.

How to hold the line:

- Screenshot the current site before you start. Home and board, light and dark, at 390 px and 1280 px, signed out and signed in as owner. Six or eight PNGs in a scratch folder is enough. Compare against the preview URL at the end and diff them by eye.
- Port `public/styles.css` token for token. The values in `@layer tokens` become the Tailwind `@theme` block with the same names and the same numbers. Do not round `--space-3` to a Tailwind default because it is close enough.
- Keep the DOM shape of the public page. Same elements, same order, same `aria-current` on the active filter. This protects the CSS port and the view transitions at the same time.
- The view transition rules move across as plain CSS, unchanged. Filter navigation should still animate.
- Anything that cannot be reproduced exactly gets written down in the PR rather than quietly accepted.

## What we have today

Roughly 5,100 lines of TypeScript in one Worker. The parts that matter for this decision:

- `src/index.ts` hand-routes every path. HTML, API, images, health.
- `src/ui/*.ts` build pages as template strings with a manual `escapeHtml`. `catalog-page.ts` is 232 lines of string concatenation, and `catalog-script.ts` is 305 lines of vanilla DOM code shipped as a string.
- `public/styles.css` is 871 lines of native CSS with cascade layers and custom properties.
- Anonymous board pages ship zero JavaScript. Owners get `clerk.browser.js` from Clerk's CDN plus two small module scripts.
- Caching is the good part. `wrangler.jsonc` has `cache: { enabled: true }`, public HTML sends `cloudflare-cdn-cache-control: public, max-age=86400, stale-while-revalidate=604800` with a `cache-tag`, and mutations purge by tag through `ctx.cache.purge`. On a hit the Worker never runs and D1 is never touched. `Vary: cookie` keeps signed-in users off the anonymous copy.
- Category filters are ordinary links to separately cached URLs, which is why filtering is instant and why cross-document view transitions work.

The string templates are the actual maintenance problem. The caching is not, and it is the thing most likely to break in a migration.

## What TanStack Start changes

The good:

- Cloudflare supports it directly. `@cloudflare/vite-plugin` with `viteEnvironment: { name: 'ssr' }`, `main` pointing at `@tanstack/react-start/server-entry` or your own `src/server.ts`. Bindings come from `import { env } from "cloudflare:workers"`. D1, R2, Browser and Images bindings all stay as they are.
- Hosting does not change. Still one Worker, still `wrangler deploy`, still the same D1 and R2. The build step moves from Wrangler's esbuild to Vite.
- Workers Cache sits in front of the Worker, so it is framework-agnostic. The cache headers and tag purging keep working as long as the SSR response carries the same headers and no `Set-Cookie`.
- File-based routes, typed loaders, server functions and React components replace the hand-rolled router and the string templates. That is the whole point of doing this.
- Clerk ships `@clerk/tanstack-react-start` with `clerkMiddleware()` and `getAuth()`, which replaces most of `src/auth.ts`.

The cost, and it is real: TanStack Start always hydrates. There is no zero-JavaScript mode. `ssr: false` and `ssr: 'data-only'` change where code runs, not whether the client bundle ships. A minimal Start app lands somewhere around 60 to 170 KB gzipped depending on what you pull in. Today an anonymous board page ships 0 KB of JavaScript.

So "no degradation in speed" cannot mean "identical". It has to mean a budget. My read: TTFB and LCP should not move at all, because the HTML still comes from the edge cache and the product image is still the LCP element. What moves is bytes and main-thread work after render, which shows up as TBT on a cheap phone. Pick a number before you start, measure it on the preview URL, and treat a miss as a reason to stop.

One more trap. If category filters become client-side router links, every filter click runs the Worker and queries D1 to fetch loader data, instead of hitting cached HTML. Keep them as plain anchors. You keep the cache, and you keep cross-document view transitions for free.

## Recommendation

Do it, but gate it on a spike. Half a day of work tells you whether the numbers are acceptable, before you rewrite anything you care about.

Use Base UI for the interactive parts, and only those. Details in the next section.

If the numbers come back bad, there is a cheaper path that gets you most of what you asked for: keep `src/index.ts` and its routing exactly as it is, swap the template strings for React components rendered with `renderToReadableStream` from `react-dom/server`, and add Tailwind through a Vite build that emits `public/styles.css`. React components, Tailwind, zero client JavaScript, no router, no framework. Base UI still works on that path, mounted as a client island on the owner's dialogs. What you give up is server functions, typed loaders and file-based routing. Keep it in your back pocket.

## Base UI

`@base-ui/react`, currently 1.7.0. It hit 1.0 in December 2025, has 35-odd components, and peers on React 17 through 19, so nothing about the React version blocks us. Every component has its own subpath export, `@base-ui/react/dialog` and so on, which keeps tree shaking honest. `date-fns` shows up as an optional peer for the date components and we can ignore it. shadcn/ui switched its default primitives to Base UI in July 2026, so if you ever want pre-styled Tailwind versions to copy from, they exist. I would skip shadcn here. It copies a lot of code into the repo, and AGENTS.md says keep the code small.

The rule that makes this safe: Base UI goes inside the owner-only island and nowhere else. The board grid, the filters, the card markup and the home page board list stay plain semantic HTML with Tailwind classes on it. An anonymous visitor should download exactly the same amount of Base UI as they do today, which is none. The owner already downloads Clerk's script, so a few more kilobytes there costs nothing that matters.

What maps to what:

- Import dialog, edit dialog and the board onboarding dialog become `Dialog`. This replaces `showModal()`, the manual `data-close-import-dialog` wiring and the focus handling in `catalog-script.ts`.
- Delete product becomes `AlertDialog`. Right now it deletes with no confirmation, which is a small bug fix riding along.
- The category picker in the edit form becomes `Select`.
- The image carousel becomes `Scroll Area`. That deletes `updateCarouselControls` and the scroll math, maybe 60 lines.
- Labels, error text and the busy state become `Field` and `Form`. The `role="alert"` paragraphs and the `hidden` toggling go away.
- Import failures could become `Toast` instead of inline error paragraphs. Nice, not required. Decide when you get there.

What does not become Base UI:

- Category filters stay plain `<a href>`. `Tabs` would make them client-driven, which breaks the cached-HTML navigation the whole design rests on. This is the same constraint as the router links, and it is the easiest one to get wrong.
- The add-product and edit-product buttons stay plain `<button>`. `Button` buys nothing here.
- Product cards stay plain markup.

Cost check: Base UI's own issue tracker notes that importing Dialog alone pulls in the anchor positioning code, so per-component weight is not as small as the subpath exports suggest. It also brings `@floating-ui/react-dom` and `@babel/runtime` along. This lands on the owner bundle only, so it does not touch the step 0 budget, but look at the analyzer output once rather than guessing.

## Clerk, now that we are on React

Yes, this gets nicer, and it is a small change. `@clerk/tanstack-react-start` gives you `ClerkProvider`, `SignInButton`, `UserButton` and a `Show when="signed-in" / when="signed-out"` wrapper. `SignInButton` takes `mode="modal"`, which opens sign-in over the current page instead of bouncing to `accounts.someday.fyi` and back.

Today the home page loads `clerk.browser.js` for anonymous visitors anyway, just to call `buildSignInUrl` on click. So the modal costs almost nothing new. It replaces a redirect with a dialog on a page that already pays for Clerk.

Worth knowing before you get excited: sign-in here is Apple only and invite-only, and the modal does not remove the Apple hop.

The native sheet with Face ID that you get on an Apple device comes from Apple's own Sign in with Apple JS SDK with `usePopup: true`. Safari presents that as a system sheet, no navigation at all. Clerk's web components do not use that SDK. They run standard OAuth and Clerk defaults to redirect on purpose, because popup OAuth is unreliable on mobile browsers, PWAs and WebViews. So `mode="modal"` gives you Clerk's dialog over the page, and clicking "Continue with Apple" still navigates to `appleid.apple.com` and back.

Two ways out, neither of which I would take:

- `signIn.authenticateWithPopup({ strategy: "oauth_apple", redirectUrl: "/sso-callback" })` exists in clerk-js and keeps the current page. It needs a custom flow instead of the prebuilt UI, and it is a popup window showing Apple's web page, not the native sheet. Desktop only in practice.
- Apple's JS SDK for the real sheet means wiring Apple's SDK to a Clerk custom flow yourself. That is a lot of moving parts for one owner signing in occasionally, and it is exactly the kind of code this PR is trying to delete.

The redirect is also less rough than it sounds on Apple hardware. A Safari user already signed into iCloud usually lands on Apple's page and confirms with Touch ID or Face ID immediately.

So the honest win from the modal is one hop fewer, losing the bounce through the hosted portal and the flash of a differently styled page. The Apple round trip stays.

`UserButton` is the bigger quality-of-life gain. Right now the home page shows the owner's name as a link and there is no way to sign out from inside the app at all. `UserButton` gives an avatar menu with account management and sign out, and it defaults to modal.

Styling matches without much work. Clerk's default theme respects `color-scheme: light dark`, which the app already sets, so light and dark follow the system the way everything else does. Use the `appearance.variables` prop wired to the same token values for the accent color, radius and font so the modal does not look borrowed.

Scope it carefully, because of the parity rule and because ADR 0014 says the board page carries no login prompt, profile menu or account navigation:

- Home page: swap the "Sign in" anchor for `SignInButton mode="modal"` styled to look identical to the current link. Same text, same position.
- Home page, signed in: `UserButton` is a real improvement but it is a visible change, an avatar where a name used to be. My call is to do it, and to put a before and after screenshot in the PR so it is a deliberate decision rather than a side effect.
- Board page: nothing changes. No `UserButton`, no sign-in affordance. Same as today.
- The board naming dialog stays ours. It is app data, not auth.
- `/auth/redirect` can stay. Modal sign-in resolves in place, but the portal path still exists for anyone who lands on it.

If `UserButton` feels like too much drift for a migration PR, ship the modal only and add the avatar menu afterwards. Both are cheap.

## Plan of action

### Step 0. Measure first

Record on the live site, board page and home page, anonymous and signed in:

```sh
curl -sI https://someday.fyi/isaks-board | grep -iE 'cf-cache-status|cache-control|age|vary'
```

Plus a Lighthouse mobile run for LCP, TBT and total transfer size, and the screenshot set from the top of this document. Write the numbers down in the PR. Without a before, neither "no degradation" nor "looks the same" is falsifiable.

Set the budget now. Suggested: TTFB unchanged on a cache hit, LCP within 100 ms, and at most 90 KB gzipped of new JavaScript on an anonymous board page.

### Step 1. Spike on a branch

New branch, no deletions yet. Add `@tanstack/react-start`, `@cloudflare/vite-plugin`, `@vitejs/plugin-react`, `vite`, `tailwindcss`, `@tailwindcss/vite`.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
    tailwindcss(),
  ],
})
```

`wrangler.jsonc` keeps every binding, `cache`, `observability` and the secrets block. `main` becomes `src/server.ts`. The `assets` block goes away, since the Vite plugin generates the deployable config with the client build in it.

Build one route, `/$boardSlug`, that reads D1 through the existing `listProducts` and renders the product grid. Deploy it as a PR preview. Then measure the same things as step 0 and compare.

Three things to confirm in the spike, because they are the ones that would kill the plan:

1. A streamed SSR response with `cloudflare-cdn-cache-control` and `cache-tag` actually caches. Check for `cf-cache-status: HIT` on a second request. If streaming fights the cache, switch the public routes to a non-streaming render handler in `src/server.ts`.
2. `ctx.cache.purge({ tags })` is reachable from a custom entrypoint. The custom entry exports a normal `fetch`, so `env` and `ctx` should be in hand, but check it rather than assume.
3. `nodejs_compat` plus the Clerk backend SDK plus `openai` all build under Vite for the Workers target.

Go or no go here.

### Step 2. Port the pages

`src/ui/home-page.ts` and `src/ui/catalog-page.ts` become React components. The Phosphor SVGs become small components, one per icon, same inline SVG output. `escapeHtml` and `src/ui/html.ts` get deleted, because JSX escapes for you.

Do the public markup first, with no Base UI in it. Heading, filter links, product grid, empty state, board list. Get a board page rendering from D1 and measure it against the budget before any interactive code exists. That measurement is the honest one, and you only get it while the page is still dumb.

Port `public/styles.css` to Tailwind in the same pass. Move the token block in `@layer tokens` into Tailwind v4's `@theme`, keep the view transition rules as plain CSS in the same stylesheet, and convert the component classes to utilities on the JSX. Delete `public/styles.css` when the last class is gone.

Keep `src/domain/*`, `src/db/*`, `src/images.ts` and the whole of `src/import/*` untouched. That is 2,000 lines of working logic with nothing framework-specific in it.

### Step 3. Move the routes

- `/` and `/$boardSlug` become file-based routes with loaders calling the existing `db/` functions.
- `/api/products`, `/api/product-previews`, `/api/boards` become server functions. The dialogs call them directly instead of going through `src/ui/api-client-script.ts`, so that file and its hand-written fetch wrapper get deleted.
- `/images/*` stays a server route wrapping `serveProductImage`. It has to keep its own long cache headers.
- `/health` stays a server route.
- Reserved slug handling moves into the `/$boardSlug` loader.

Category filter links stay as `<a href>`, not router `Link`s. Write a comment saying why, or someone will "fix" it later.

### Step 4. Rebuild the owner controls with Base UI

Install `@base-ui/react`. Replace the three dialogs, the category select and the image carousel as listed above, and delete `src/ui/catalog-script.ts` and `src/ui/home-script.ts` as their behaviour moves into components. This is the part of the codebase you actually wanted to stop touching, so it is worth doing properly rather than transliterating the old DOM code into `useEffect`.

Keep the whole tree behind `canManage`. Lazy-load it if the analyzer says the owner bundle got fat, but do not bother until you have the number.

Two behaviours in the current script are easy to lose and worth writing down: the active filter scrolls itself into view on load, and the import form has a two-step flow where the URL step hides once the preview arrives. Both need to survive.

### Step 5. Swap auth

Replace `src/auth.ts` with `@clerk/tanstack-react-start`. `clerkMiddleware()` in `src/start.ts`, `getAuth()` inside server functions and loaders. `ClerkProvider` goes inside `<body>`, not around `<html>`, which the SDK docs are explicit about.

This is also where the modal sign-in and `UserButton` from the Clerk section land, on the home page only.

Watch the client cost. Mounting `ClerkProvider` around the whole app would ship Clerk's JavaScript to anonymous visitors, which today it does not. Render the provider and the edit dialogs only when the viewer owns the board, the same `canManage` split as today.

### Step 6. Restore the caching contract

This is where the migration succeeds or quietly fails. Recreate exactly:

- Anonymous HTML: `cache-control: public, max-age=0, must-revalidate`, `cloudflare-cdn-cache-control: public, max-age=86400, stale-while-revalidate=604800`, `vary: cookie`, plus `cache-tag: board-<id>` or `boards`.
- Signed-in HTML: `cache-control: private, no-store`.
- Mutations purge the affected board tag, and board-list changes purge `boards`.

Set the headers with `setResponseHeaders` in the route's server code, or wrap the handler in `src/server.ts` if that turns out cleaner. Then verify with curl, signed out and signed in, and verify that a product edit changes the anonymous page on the next request.

Keep `src/catalog-cache.ts` as is. It is 51 lines and none of it is framework-specific.

### Step 7. Tests and CI

`src/index.test.ts` mocks the db layer and calls `worker.fetch`. Rewrite it against the new routes, or drop most of it. AGENTS.md says lean on types and only test real business logic, and the import pipeline tests are the ones worth keeping. They should pass unchanged.

`vitest.config.ts` needs to work alongside the Vite config. Expect some fighting between `@cloudflare/vitest-plugin` and the Start plugin, and budget an hour for it.

Both GitHub workflows need `npm run build` before `wrangler deploy` and before `wrangler versions upload`. `npm run dev` changes from `wrangler dev` to `vite dev`. The `wrangler deploy --dry-run` check in CI needs to run after a build.

### Step 8. Documentation

- New ADR superseding 0001, since "do not use React or another frontend framework" and "the public catalog does not require JavaScript" both stop being true. Say what the JavaScript budget is instead.
- New ADR superseding 0005, since Tailwind and component libraries were both explicitly rejected there. Record why it changed, and record the owner-island rule for Base UI, because that rule is the only thing protecting the public page.
- Amend 0014 if `UserButton` ships. It currently says the app has no profile menu. That stays true for board pages and stops being true for the home page.
- 0008 stays true. 0012 stays true, the icons are still inline Phosphor SVG.
- Update README for the new dev and build commands.

## Definition of done

- Screenshots match the before set. Home and board, light and dark, two widths, signed out and owner.
- Filter navigation still animates through view transitions.
- `cf-cache-status: HIT` on a second anonymous request to a board page, and the anonymous page still shows no management controls.
- Editing a product changes the anonymous page on the next request, so tag purging works.
- Signed-in HTML is `private, no-store`.
- Anonymous JavaScript on a board page is inside the step 0 budget, and the analyzer shows no `@base-ui` or Clerk code on that route.
- Add, edit, delete, image picking and board onboarding all work by hand, not just in tests.
- `src/ui/catalog-script.ts`, `src/ui/home-script.ts`, `src/ui/api-client-script.ts`, `src/ui/html.ts` and `public/styles.css` are gone.
- `npm run check` passes.

## Risks, ranked

1. **Hydration cost on anonymous pages.** The one guaranteed regression. Mitigated by the budget in step 0 and the go/no-go in step 1.
2. **Cache breakage.** Silent and expensive. A missed header means every board view runs the Worker and hits D1. Verify with curl, not by reading code.
3. **Client-side navigation stealing cache hits.** Solved by keeping filters as plain anchors, but easy to regress later.
4. **Clerk or Base UI JavaScript reaching anonymous visitors.** Both belong to the owner island. One misplaced import in a shared component and the anonymous bundle grows. Check the analyzer output for `@base-ui` on the public route before merging.
5. **Visual drift.** A thousand small "while I'm here" changes are how a migration stops looking like a migration. The screenshot diff is the only defence.
6. **Losing behaviour in the dialog rewrite.** The old script is ugly but it works. Click through add, edit, delete, image picking and the board onboarding flow by hand before deleting it.
7. **Vite plus Vitest plus the Workers pool.** Annoying, not dangerous.
8. **Prerendering.** Skip it. Board content is request-time data, and there is an open TanStack issue about prerendering and ISR not behaving as documented on Cloudflare. Workers Cache already does this job.

## Rough sizing

Half a day for the spike. Two or three evenings for the page and Tailwind port. One evening for routes and server functions, two for the Base UI rewrite of the dialogs, one for auth, one for cache verification and CI. Call it a week and a half of evenings, with a real exit point after the spike.

## Sources

- [TanStack Start hosting guide](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start on Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [Server entry point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Workers Cache](https://developers.cloudflare.com/workers/cache/configuration/)
- [Your Worker can now have its own cache in front of it](https://blog.cloudflare.com/workers-cache/)
- [Clerk clerkMiddleware for TanStack React Start](https://clerk.com/docs/reference/tanstack-react-start/clerk-middleware)
- [TanStack issue 7527, prerendering and ISR on Cloudflare](https://github.com/TanStack/router/issues/7527)
- [Clerk TanStack React Start quickstart](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart)
- [Clerk SignInButton, modal mode](https://clerk.com/docs/tanstack-react-start/reference/components/unstyled/sign-in-button)
- [Clerk appearance themes and color-scheme](https://clerk.com/docs/react/guides/customizing-clerk/appearance-prop/themes)
- [Clerk SignIn object, authenticateWithPopup](https://clerk.com/docs/reference/javascript/sign-in)
- [Clerk on why social login defaults to redirect](https://clerk.com/articles/how-do-i-implement-social-login-for-my-web-app-2)
- [Base UI quick start](https://base-ui.com/react/overview/quick-start)
- [Base UI Scroll Area](https://base-ui.com/react/components/scroll-area)
- [Base UI issue 1246, bundle size improvements](https://github.com/mui/base-ui/issues/1246)
