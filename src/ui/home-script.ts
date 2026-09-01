export const homeScript = String.raw`
import { apiRequest, loadClerk } from "/api-client.js"

const boardDialog = document.querySelector("#board-dialog")
const boardForm = boardDialog?.querySelector("form")
const boardNameInput = document.querySelector("#board-name")
const boardSlugPreview = document.querySelector("[data-board-slug-preview]")
const boardError = document.querySelector("[data-board-error]")
const unavailableSlugs = new Set(
  (boardDialog?.dataset.unavailableSlugs ?? "").split(","),
)
const signInLink = document.querySelector("[data-sign-in]")

signInLink?.addEventListener("click", async (event) => {
  event.preventDefault()
  let signInUrl = signInLink.href

  try {
    const clerk = await loadClerk()
    const redirectUrl = new URL("/auth/redirect", location.origin).href

    signInUrl = clerk.buildSignInUrl({ redirectUrl })
  } catch {}

  location.assign(signInUrl)
})

function slugFromName(name) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function updateBoardSlugPreview() {
  const baseSlug = slugFromName(boardNameInput?.value ?? "")
  let slug = baseSlug
  let suffix = 2

  while (slug && unavailableSlugs.has(slug)) {
    slug = baseSlug + "-" + suffix
    suffix += 1
  }

  if (boardSlugPreview) boardSlugPreview.textContent = slug || "your-board"
}

if (boardDialog && !boardDialog.open) boardDialog.showModal()
boardNameInput?.addEventListener("input", updateBoardSlugPreview)
updateBoardSlugPreview()

boardForm?.addEventListener("submit", async (event) => {
  event.preventDefault()
  if (!boardError || !boardNameInput) return

  boardError.hidden = true

  try {
    const board = await apiRequest("/api/boards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: boardNameInput.value }),
    })

    location.assign("/" + encodeURIComponent(board.slug))
  } catch (error) {
    boardError.textContent =
      error instanceof Error ? error.message : "The board could not be created."
    boardError.hidden = false
  }
})
`
