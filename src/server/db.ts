import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// One client per process. In dev, hot reloads re-evaluate modules, so cache it on globalThis
// to avoid opening a new connection pool on every edit — but rebuild it if DATABASE_URL changes
// (e.g. after editing .env.development) or the client is regenerated after a schema change,
// so the dev server never uses a stale database or stale models.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaUrl?: string; prismaClass?: unknown };

function createClient(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function getClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and configure it.");

  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== url || globalForPrisma.prismaClass !== PrismaClient) {
    // Let requests already using the old client finish before closing its pool.
    const previous = globalForPrisma.prisma;
    if (previous) setTimeout(() => void previous.$disconnect(), 30_000);
    globalForPrisma.prisma = createClient(url);
    globalForPrisma.prismaUrl = url;
    globalForPrisma.prismaClass = PrismaClient;
  }
  return globalForPrisma.prisma;
}

/** Lazily resolves the current client, so a changed DATABASE_URL takes effect on the next query. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
