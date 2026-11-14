// Runs the migration and seed in an in-memory Postgres (PGlite), then checks
// the privacy rules as different users. Usage: npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import runPrivacyTests from "./privacy.test.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const migrations = join(here, "..", "migrations");
const files = [
  join(here, "supabase-stub.sql"),
  ...readdirSync(migrations).filter((f) => f.endsWith(".sql")).sort().map((f) => join(migrations, f)),
  join(here, "..", "seed.sql"),
];

const db = new PGlite();
for (const f of files) {
  try {
    await db.exec(readFileSync(f, "utf8"));
    console.log("ran", f.split(/[\/]/).pop());
  } catch (e) {
    console.error("FAILED", f, e.message, e.where ?? "");
    process.exit(1);
  }
}
const failed = await runPrivacyTests(db);
process.exit(failed ? 1 : 0);
