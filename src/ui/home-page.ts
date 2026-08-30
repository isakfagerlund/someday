import type { Board } from "../db/boards"
import { escapeHtml } from "./html"

interface HomePageProps {
  boardStatus?: string | null
  boards: Board[]
  ownerBoard?: Board
  signInUrl: string
  userName: string | null
}

export function renderHomePage({
  boardStatus,
  boards,
  ownerBoard,
  signInUrl,
  userName,
}: HomePageProps) {
  const boardLinks = boards
    .map(
      (board) =>
        `<li><a class="board-link" href="/${encodeURIComponent(board.slug)}">${escapeHtml(board.name)}</a></li>`,
    )
    .join("")
  let action = `<a class="home-action" href="${escapeHtml(signInUrl)}">Sign in</a>`

  if (userName && ownerBoard) {
    action = `<a class="home-user" href="/${encodeURIComponent(ownerBoard.slug)}">${escapeHtml(userName)}</a>`
  } else if (userName) {
    action = `<span class="home-user">${escapeHtml(userName)}</span>`
  }

  const error =
    boardStatus === "invalid"
      ? `<p class="product-form__error" role="alert">Enter a name with at least one letter or number.</p>`
      : ""
  const onboarding =
    userName && !ownerBoard
      ? `<dialog class="board-dialog" id="board-dialog" aria-labelledby="board-dialog-title">
      <form class="product-form" action="/api/boards" method="post">
        <div class="product-form__heading">
          <h2 id="board-dialog-title">Create your board</h2>
        </div>
        <p class="board-dialog__intro">Choose a name. We'll use it to make your board's URL.</p>
        <label for="board-name">Board name</label>
        <input id="board-name" name="name" maxlength="80" autofocus required>
        ${error}
        <div class="product-form__actions board-form__actions">
          <button class="primary-button" type="submit">Create board</button>
        </div>
      </form>
    </dialog>
    <script type="module" src="/home.js"></script>`
      : ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <title>someday</title>
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main class="wrapper home stack">
      <div class="home__heading">
        <h1>someday</h1>
        ${action}
      </div>
      <nav aria-label="Public boards">
        <ul class="board-list" role="list">${boardLinks}</ul>
      </nav>
    </main>
    ${onboarding}
  </body>
</html>`
}
