// Basiq API v3 client
// All calls are server-side only — BASIQ_API_KEY is never exposed to the browser.

const BASE_URL = "https://au-api.basiq.io";

// ─── Token ────────────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const apiKey = process.env.BASIQ_API_KEY;
  if (!apiKey) throw new Error("BASIQ_API_KEY environment variable is not set.");

  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: {
      // Basiq API keys are already base64-encoded — use directly as the Basic auth value.
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": "3.0",
    },
    body: "scope=SERVER_ACCESS",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basiq token request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

// Creates a new Basiq user and returns their Basiq user ID.
// mobile must be in E.164 format, e.g. "+61412345678".
export async function createBasiqUser(email: string, mobile: string): Promise<string> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ email, mobile }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basiq create user failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

// Updates an existing Basiq user (e.g. to add a mobile number before auth link creation).
export async function updateBasiqUser(userId: string, mobile: string): Promise<void> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/users/${userId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ mobile }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basiq update user failed (${res.status}): ${body}`);
  }
}

// ─── Auth link ────────────────────────────────────────────────────────────────

// Creates a Basiq consent link. The user opens this URL to connect their bank.
// After connecting, Basiq redirects them to `redirectUrl`.
// mobile (E.164 format) is passed directly in the auth link request so it
// doesn't need to be persisted on the Basiq user record.
export async function getAuthLink(
  userId: string,
  redirectUrl: string,
  mobile: string,
): Promise<string> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/users/${userId}/auth_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ redirectUrl, mobile }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basiq auth link failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.links.public as string;
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

// Fetches all posted transactions, handling pagination.
// Tries with a server-side date filter first; falls back to unfiltered + client-side cutoff
// when Basiq rejects the filter parameter.
export async function getTransactions(userId: string): Promise<BasiqTransaction[]> {
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const fromStr = from.toISOString().split("T")[0];
  return _fetchTransactionPages(userId, fromStr, true);
}

async function _fetchTransactionPages(
  userId: string,
  fromStr: string,
  useFilter: boolean,
): Promise<BasiqTransaction[]> {
  const token = await getToken();
  const filterPart = useFilter ? `filter=transaction.postDate.gte(${fromStr})&` : "";
  const initialUrl = `${BASE_URL}/users/${userId}/transactions?${filterPart}limit=500`;

  if (process.env.NODE_ENV === "development") {
    console.log(`[Basiq] → GET ${initialUrl}`);
  }

  const all: BasiqTransaction[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    });

    if (!res.ok) {
      const body = await res.text();

      // Filter rejected — retry without date filter and apply cutoff client-side.
      if (useFilter && res.status === 400 && body.includes("parameter-not-valid")) {
        console.warn("[Basiq] Date filter rejected — retrying without filter, applying cutoff client-side");
        return _fetchTransactionPages(userId, fromStr, false);
      }

      // Access-denied / connections not enabled — signal with a sentinel so the
      // route handler can return a friendly message.
      if (
        res.status === 403 ||
        body.includes("access-denied") ||
        body.includes("no-production-access") ||
        body.toLowerCase().includes("connections not enabled")
      ) {
        throw new Error("CONNECTIONS_UNAVAILABLE");
      }

      throw new Error(`Basiq transactions failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const items = (data.data ?? []) as BasiqTransaction[];
    all.push(...items.filter((t) => t.status === "posted"));
    url = (data.links?.next as string | undefined) ?? null;
  }

  // Client-side date cutoff when the server didn't apply one.
  if (!useFilter) {
    return all.filter((t) => t.postDate >= fromStr);
  }
  return all;
}
