import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// The Desk only GENERATES the client. Migrations are owned by the website repo (kanyaka-marketing):
// change the schema there, run its migration, then `npm run schema:sync` here.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
