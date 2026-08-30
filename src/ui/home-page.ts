import type { Board } from "../db/boards"
import { escapeHtml } from "./html"

interface HomePageProps {
  boards: Board[]
  ownerBoard?: Board
  signInUrl: string
  userName: string | null
}

export function renderHomePage({
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
  </body>
</html>`
}
