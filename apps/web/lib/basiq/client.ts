// Basiq API v3 client — server-side only.
// BASIQ_API_KEY is never read on the client; this module must not be imported
// from any "use client" file or Next.js page that ships to the browser.

// ─── Config ───────────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return (process.env.BASIQ_API_BASE_URL ?? "https://au-api.basiq.io").replace(/\/$/, "");
}

function getApiKey(): string {
  const key = process.env.BASIQ_API_KEY;
  if (!key) {
    throw new BasiqError(0, "config", "BASIQ_API_KEY is not set. Add it to your environment variables.");
  }
  return key;
}

// ─── Error ────────────────────────────────────────────────────────────────────

export class BasiqError extends Error {
  constructor(
    public readonly status: number,
    public readonly context: string,
    public readonly detail: string,
  ) {
    super(`Basiq error ${status} [${context}]: ${detail}`);
    this.name = "BasiqError";
  }
}

// ─── Token cache ──────────────────────────────────────────────────────────────

// Module-level cache — survives across calls within a warm serverless invocation.
// On cold starts the token is re-fetched (acceptable). This eliminates redundant
// token requests within a single paginated fetch (N pages → 1 token request).
interface TokenEntry {
  token: string;
  expiresAt: number; // ms since epoch
}

let _tokenCache: TokenEntry | null = null;

// getBasiqAccessToken returns a valid SERVER_ACCESS token, fetching a fresh one
// if the cache is empty or within 60 s of expiry.
export async function getBasiqAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.token;
  }

  const apiKey = getApiKey();

  const res = await fetch(`${getBaseUrl()}/token`, {
    method: "POST",
    headers: {
      // Basiq API keys are pre-encoded; pass directly as the Basic auth credential.
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: "scope=SERVER_ACCESS",
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new BasiqError(401, "/token", "Invalid API key. Verify BASIQ_API_KEY in your environment.");
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new BasiqError(res.status, "/token", detail);
  }

  const data = await res.json();
  const expiresIn: number = typeof data.expires_in === "number" ? data.expires_in : 3600;
  _tokenCache = { token: data.access_token as string, expiresAt: now + expiresIn * 1000 };
  return _tokenCache.token;
}

// ─── Core request helper ──────────────────────────────────────────────────────

// basiqRequest makes an authenticated request to the Basiq API.
//
// `path` may be:
//   - A bare path starting with "/"  →  prefixed with BASIQ_API_BASE_URL
//   - A full URL (e.g. pagination links returned by Basiq)  →  path is extracted
//     and re-prefixed with the configured base URL so sandbox/test overrides apply.
//
// Automatically retries once on 401 after clearing the token cache, in case a
// long-lived token expired between the cache write and this request.
export async function basiqRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  _retried = false,
): Promise<T> {
  // If Basiq gave us a full URL (pagination), extract just path+query so the
  // configured base URL is always used rather than the URL hardcoded in the response.
  let resolvedPath = path;
  if (path.startsWith("http")) {
    const u = new URL(path);
    resolvedPath = u.pathname + u.search;
  }

  const url = `${getBaseUrl()}${resolvedPath}`;
  const token = await getBasiqAccessToken();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "basiq-version": "3.0",
  };
  if (method !== "GET" && method !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  // On 401, clear the token cache and retry once — the token may have expired
  // mid-session even if the cache thought it was still valid.
  if (res.status === 401 && !_retried) {
    _tokenCache = null;
    return basiqRequest<T>(method, path, body, true);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new BasiqError(res.status, resolvedPath, detail);
  }

  const json: unknown = await res.json();
  return json as T;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export type BasiqUser = {
  id: string;
  email?: string;
  mobile?: string;
};

// createBasiqUserForKashioUser creates a Basiq user for the given Kashio user.
// mobile must be in E.164 format, e.g. "+61412345678".
// Returns the Basiq user ID to store in BasiqConnection.
export async function createBasiqUserForKashioUser(
  email: string,
  mobile: string,
): Promise<string> {
  const data = await basiqRequest<{ id: string }>("POST", "/users", { email, mobile });
  return data.id;
}

// getBasiqUser fetches a Basiq user by their Basiq user ID.
export async function getBasiqUser(basiqUserId: string): Promise<BasiqUser> {
  return basiqRequest<BasiqUser>("GET", `/users/${basiqUserId}`);
}

// updateBasiqUser updates an existing Basiq user's mobile number.
// Called before auth link creation so Basiq pre-fills the correct number.
export async function updateBasiqUser(basiqUserId: string, mobile: string): Promise<void> {
  await basiqRequest("POST", `/users/${basiqUserId}`, { mobile });
}

// ─── Auth link ────────────────────────────────────────────────────────────────

type AuthLinkResponse = { links: { public: string } };

// getAuthLink creates a Basiq consent URL for the user to link their bank.
// After the user completes the flow, Basiq redirects to redirectUrl.
export async function getAuthLink(
  basiqUserId: string,
  redirectUrl: string,
  mobile: string,
): Promise<string> {
  const data = await basiqRequest<AuthLinkResponse>(
    "POST",
    `/users/${basiqUserId}/auth_link`,
    { redirectUrl, mobile },
  );
  return data.links.public;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type BasiqTransaction = {
  id: string;
  status: string;
  description: string;
  amount: string;           // signed string, e.g. "-42.50"
  direction: "debit" | "credit";
  postDate: string;         // YYYY-MM-DD
  merchant?: { businessName?: string };
};

type TransactionPage = {
  data: BasiqTransaction[];
  links?: { next?: string };
};

// getTransactions fetches all posted transactions for a Basiq user from `from`
// (YYYY-MM-DD) to today, following Basiq's pagination automatically.
// Defaults to 12 months ago if `from` is omitted.
export async function getTransactions(
  basiqUserId: string,
  from?: string,
): Promise<BasiqTransaction[]> {
  let fromStr: string;
  if (from) {
    fromStr = from;
  } else {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    fromStr = d.toISOString().split("T")[0];
  }

  const all: BasiqTransaction[] = [];
  let path: string | null =
    `/users/${basiqUserId}/transactions?filter=postDate.gte:${fromStr}&limit=500`;

  while (path) {
    const page: TransactionPage = await basiqRequest<TransactionPage>("GET", path);
    all.push(...page.data.filter((t) => t.status === "posted"));
    path = page.links?.next ?? null;
  }

  return all;
}
