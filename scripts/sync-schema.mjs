// Copies the Prisma schema from the website repo (which owns the migrations) into this repo.
// Usage: npm run schema:sync   (expects ../HELLO next to this folder, or set SCHEMA_SOURCE)
import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve(process.env.SCHEMA_SOURCE ?? "../HELLO/prisma/schema.prisma");
if (!existsSync(source)) {
  console.error(`Schema not found at ${source}. Set SCHEMA_SOURCE to the website repo's prisma/schema.prisma.`);
  process.exit(1);
}
copyFileSync(source, resolve("prisma/schema.prisma"));
console.log(`Copied ${source} → prisma/schema.prisma`);
