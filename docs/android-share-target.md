# Android share target

Android users install someday from Chrome's menu (**Install app** / **Add to Home
screen**). Chrome then builds a WebAPK from `public/site.webmanifest`, and its
`share_target` entry puts someday in the system share sheet. Sharing a product page
from any app opens `/save?…`, where someday handles sign-in, board selection, and the
existing image preview. Nothing is published until the user presses Save product.

There is no extension and no store listing. Chrome on Android does not support
extensions, so [the Chrome extension](../chrome-extension/README.md) is desktop only,
and [the Shortcut](../shortcuts/README.md) is iPhone only.

The share target is a GET, so the shared values arrive as query parameters. Chrome
puts the page URL in `url`, but many apps instead send the link inside a sentence in
`text` or `title`. `/save` reads `url` first and otherwise takes the first link it
finds in the other two, so a share like `Look at this https://…` still works.

Chrome dropped the service worker requirement for installing from the menu in version
108, so someday ships no service worker. The cost is that Chrome never shows its own
install prompt; a new Android user installs from the menu once.

## Manual checks

- Open someday in Chrome on Android, install it from the menu, and confirm it launches
  standalone rather than as a browser shortcut.
- Share a product page from Chrome and confirm someday appears in the share sheet.
- Share from an app that sends the link in `text`, such as Instagram or Reddit.
- Share a URL containing `?`, `&`, and `%` and confirm the whole URL reaches the import.
- Share from a page that is not a product, and confirm the save page explains that the
  link cannot be saved.
- Sign in from a shared link and confirm it survives the return from Clerk.

Reference: [Receiving shared data with the Web Share Target API](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target).
