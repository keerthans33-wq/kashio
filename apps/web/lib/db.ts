import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function createClient() {
  // Strip sslmode from the URL — pg-connection-string v2.7+ treats 'require'
  // as 'verify-full', which rejects Supabase's certificate chain. We set SSL
  // explicitly on the Pool instead so rejectUnauthorized: false takes effect.
  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!rawUrl) throw new Error("DATABASE_URL is not set. Add it to your Vercel environment variables.");
  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");
  const connectionString = url.toString();

  const isLocal = connectionString.includes("localhost");
  const pool = new Pool({
    connectionString,
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
