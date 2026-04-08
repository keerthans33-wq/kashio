import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const rawUrl = process.env.DATABASE_URL ?? "";
const url = new URL(rawUrl);
url.searchParams.delete("sslmode");

const pool = new Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
});

const db = new PrismaClient({ adapter: new PrismaPg(pool as any) });

async function main() {
  const c = await db.deductionCandidate.deleteMany({});
  const t = await db.transaction.deleteMany({});
  const b = await db.importBatch.deleteMany({});
  console.log("Deleted:", { candidates: c.count, transactions: t.count, batches: b.count });
}

main().catch(console.error).finally(() => db.$disconnect());
