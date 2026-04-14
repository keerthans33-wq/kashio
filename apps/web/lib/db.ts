import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

function resolveIPv4(hostname: string): string {
  try {
    const ip = execSync(
      `node -e "require('dns').lookup('${hostname}',{family:4},(e,a)=>process.stdout.write(a||''))"`,
      { timeout: 3000 }
    ).toString().trim();
    return ip || hostname;
  } catch {
    return hostname;
  }
}

function createClient() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!rawUrl) throw new Error("DATABASE_URL is not set. Add it to your Vercel environment variables.");
  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  // Supabase pooler resolves to IPv6 on many machines — force IPv4 by
  // pre-resolving the hostname and substituting the IP address.
  if (!isLocal) {
    url.hostname = resolveIPv4(url.hostname);
  }

  const connectionString = url.toString();
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
