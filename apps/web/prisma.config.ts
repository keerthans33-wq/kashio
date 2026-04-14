import { config } from "dotenv";
// Load .env.local first (Next.js convention), fall back to .env
config({ path: ".env.local", override: true });
config();

import { execSync } from "child_process";
import { defineConfig } from "prisma/config";

// Prisma's schema engine prefers IPv6 which is unreachable on many machines.
// Resolve the hostname to an IPv4 address and substitute it into the URL.
function forceIPv4(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    const ipv4 = execSync(
      `node -e "require('dns').lookup('${url.hostname}',{family:4},(e,a)=>process.stdout.write(a))"`,
      { timeout: 5000 }
    ).toString().trim();
    if (ipv4) url.hostname = ipv4;
    return url.toString();
  } catch {
    return rawUrl;
  }
}

const migrationUrl = forceIPv4(
  process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]
);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});
