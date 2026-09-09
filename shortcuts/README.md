# Save to someday

`save-to-someday.plist` is the editable source for the signed download at
`public/shortcuts/Save to someday.shortcut`.

The Shortcut receives a URL or Safari webpage from the share sheet, extracts the
first URL, URL-encodes it, and opens `https://someday.fyi/save?url=…`. Someday handles
sign-in, board selection, and the existing image preview. Nothing is published
until the user presses Save product.

To rebuild on macOS:

```sh
plutil -convert binary1 -o /tmp/someday-unsigned.shortcut shortcuts/save-to-someday.plist
shortcuts sign --mode anyone --input /tmp/someday-unsigned.shortcut --output 'public/shortcuts/Save to someday.shortcut'
```

Signing sends the Shortcut to Apple for validation. The source contains no
credentials. Commit both the source and signed download when changing it.

For a preview deployment, edit the destination in the URL action to that preview's
origin before signing a temporary test copy. The distributed Shortcut always opens
production. The bookmarklet on `/save` uses the origin it was installed from.

## Manual checks

- Open the signed download in Shortcuts and inspect all five connected actions.
- On iPhone, share a product URL from Safari using Save to someday.
- Try a URL containing `?`, `&`, and `%` and confirm the entire URL reaches the import.
- Sign in from `/save?url=…` and confirm the link survives the return from Clerk.
- With one board, the preview opens immediately. With multiple boards, choose one.
- Cancel, reopen, save, and open an existing product. Creating a first board should
  return to the shared link.
- Drag the bookmarklet from `/save` into the desktop bookmarks bar, visit a product
  page, and run it. A new Someday tab should open with that page's URL.

Reference: [Apple's Shortcuts command-line guide](https://support.apple.com/en-ph/guide/shortcuts-mac/-apd455c82f02/mac).
