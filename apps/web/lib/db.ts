import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function createClient() {
  const isLocal = process.env.DATABASE_URL?.includes("localhost");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaPg(pool as any);
  return new PrismaClient({ adapter });
}

// Reuse the Prisma client across hot reloads in development.
// Without this, each file save creates a new client and exhausts DB connections.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
