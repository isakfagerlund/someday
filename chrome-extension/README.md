# Chrome extension

Click the pinned Save to someday toolbar button on a product page. The extension
opens `/save?url=…` in a new tab, where Someday handles sign-in, board selection,
and the existing image preview. The product is published only after Save product.

The Manifest V3 extension requests only `activeTab`. It reads the current URL
when clicked, with no page scripts, background browsing collection, or separate
extension login.

## Build and install

```sh
pnpm run build:extension
```

In `chrome://extensions`, enable Developer mode, click Load unpacked, and select
`dist/chrome-extension`. Pin Save to someday from Chrome's extensions menu.

The build also creates `public/extensions/someday-chrome.zip`, downloadable from
`/save`. Unzip it before using Load unpacked. `pnpm run build` rebuilds this package
before building the website. Generated JavaScript and ZIP files are not committed.
Building requires Node 22.6+ and the `zip` command, available on our macOS and
Ubuntu build machines.

For a local or preview test:

```sh
SOMEDAY_CAPTURE_ORIGIN=http://localhost:5173 pnpm run build:extension
```

Reload the extension in Chrome after rebuilding. Normal builds target
`https://someday.fyi`, including downloads from PR previews. Publishing a Chrome
Web Store listing is a separate step; the current package installs manually.

## Manual checks

- Load the unpacked extension and confirm Chrome reports no manifest or worker errors.
- On a product page, click the toolbar icon and check that a new save tab opens.
- Check a product URL with query parameters, percent escapes, and a fragment.
- On a browser settings tab, the save page should explain that the link cannot be saved.
- Sign in, choose a board if needed, and use the existing preview to save.

References: [Chrome toolbar actions](https://developer.chrome.com/docs/extensions/reference/api/action),
[loading an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).
