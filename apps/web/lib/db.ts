import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { spawnSync } from "child_process";

function resolveIPv4(hostname: string): string {
  try {
    // Use the exact node binary running this process — avoids PATH issues with nvm/volta
    const result = spawnSync(process.execPath, [
      "-e",
      `require('dns').lookup('${hostname}',{family:4},(e,a)=>{if(e)process.exit(1);process.stdout.write(a)})`,
    ], { timeout: 3000, encoding: "utf8" });
    const ip = result.stdout?.trim();
    if (ip) {
      console.log(`[db] Resolved ${hostname} → ${ip} (IPv4)`);
      return ip;
    }
  } catch {
    // fall through
  }
  console.log(`[db] IPv4 resolution failed for ${hostname}, using hostname`);
  return hostname;
}

function createClient() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  if (!rawUrl) throw new Error("DATABASE_URL is not set. Add it to your Vercel environment variables.");
  const url = new URL(rawUrl);
  url.searchParams.delete("sslmode");

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

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
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
