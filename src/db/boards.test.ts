import { env } from "cloudflare:workers"
import { expect, it } from "vitest"
import {
  archiveBoard,
  getBoardByPastSlug,
  getBoardBySlug,
  insertBoard,
  listBoardsByOwnerId,
  listTakenSlugs,
  renameBoard,
} from "./boards"
import { insertProduct } from "./products"

const migrations = import.meta.glob<string>("../../drizzle/*/migration.sql", {
  query: "?raw",
  import: "default",
  eager: true,
})
const multipleBoardsPath = "../../drizzle/20260908175026_multiple_boards/migration.sql"

async function applyMigration(sql: string) {
  const statements = sql.split(";")
    .map(statement => statement.replace(/--> statement-breakpoint/g, "").trim())
    .filter(Boolean)
  await env.DB.batch(statements.map(statement => env.DB.prepare(statement)))
}

const sortedMigrations = Object.entries(migrations).sort(([a], [b]) => a.localeCompare(b))

it("migrates existing data and lists only the owner's boards with their own products", async () => {
  const entries = sortedMigrations
  for (const [path, sql] of entries) {
    if (path < multipleBoardsPath) await applyMigration(sql)
  }
  // Seed the historical schema directly; the current helper includes newer columns.
  await env.DB.prepare("INSERT INTO boards (id, name, slug, clerk_owner_id) VALUES (?, ?, ?, ?)")
    .bind("a", "A", "board-a", "owner").run()
  const product = {
    id: "lamp",
    sourceUrl: "https://example.com/lamp",
    canonicalUrl: "https://example.com/lamp",
    name: "Lamp",
    brand: "Example",
    category: "Home" as const,
    originalImageUrl: "",
    processedImageKey: "lamp.webp",
    backgroundRemoved: false,
    subjectScale: 0.8,
    subjectPosition: { x: 0.5, y: 0.5 },
    color: null,
    size: null,
    importEvidence: "{}",
  }
  await env.DB.prepare(`INSERT INTO products
    (id, board_id, source_url, canonical_url, name, brand, category, image_key, import_evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(product.id, "a", product.sourceUrl, product.canonicalUrl, product.name,
      product.brand, product.category, product.processedImageKey, product.importEvidence).run()
  for (const [path, sql] of entries) {
    if (path >= multipleBoardsPath) await applyMigration(sql)
  }
  await insertBoard(env.DB, { id: "b", name: "B", slug: "board-b", clerkOwnerId: "owner" })
  await insertBoard(env.DB, { id: "c", name: "C", slug: "board-c", clerkOwnerId: "other-owner" })
  await insertProduct(env.DB, "b", { ...product, id: "lamp-b", processedImageKey: "lamp-b.webp" })
  expect(await listBoardsByOwnerId(env.DB, "owner")).toMatchObject([
    { id: "a", productCount: 1, imageKey: "lamp.webp" },
    { id: "b", productCount: 1, imageKey: "lamp-b.webp" },
  ])
})

it("keeps old links working after a rename, and hides archived boards", async () => {
  // The migration test above already brought this database up to date.
  const board = await insertBoard(env.DB, { id: "gifts", name: "Gifts", slug: "gifts", clerkOwnerId: "gifter" })

  await renameBoard(env.DB, board, { name: "Presents", slug: "presents" })

  expect(await getBoardBySlug(env.DB, "presents")).toMatchObject({ name: "Presents" })
  expect(await getBoardBySlug(env.DB, "gifts")).toBeUndefined()
  expect(await getBoardByPastSlug(env.DB, "gifts")).toMatchObject({ slug: "presents" })
  expect(await listTakenSlugs(env.DB)).toEqual(expect.arrayContaining(["presents", "gifts"]))

  await archiveBoard(env.DB, board.id)

  expect(await getBoardBySlug(env.DB, "presents")).toBeUndefined()
  expect(await getBoardByPastSlug(env.DB, "gifts")).toBeUndefined()
  expect(await listBoardsByOwnerId(env.DB, "gifter")).toEqual([])
})
