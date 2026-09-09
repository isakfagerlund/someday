import { env } from "cloudflare:workers"
import { expect, it } from "vitest"
import { listBoardsByOwnerId, insertBoard } from "./boards"
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

it("migrates existing data and lists only the owner's boards with their own products", async () => {
  const entries = Object.entries(migrations).sort(([a], [b]) => a.localeCompare(b))
  for (const [path, sql] of entries) {
    if (path < multipleBoardsPath) await applyMigration(sql)
  }
  const boardA = await insertBoard(env.DB, { id: "a", name: "A", slug: "board-a", clerkOwnerId: "owner" })
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
    importEvidence: "{}",
  }
  // Seed the historical schema directly; the current helper includes newer columns.
  await env.DB.prepare(`INSERT INTO products
    (id, board_id, source_url, canonical_url, name, brand, category, image_key, import_evidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(product.id, boardA.id, product.sourceUrl, product.canonicalUrl, product.name,
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
