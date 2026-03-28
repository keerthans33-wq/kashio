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
      // Basiq token endpoint: base64-encode the API key directly (no username:password format).
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
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
export async function createBasiqUser(email: string): Promise<string> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Basiq create user failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.id as string;
}

// ─── Auth link ────────────────────────────────────────────────────────────────

// Creates a Basiq consent link. The user opens this URL to connect their bank.
// After connecting, Basiq redirects them to `redirectUrl`.
export async function getAuthLink(
  userId: string,
  redirectUrl: string,
): Promise<string> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/users/${userId}/auth_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "basiq-version": "3.0",
    },
    body: JSON.stringify({ redirectUrl }),
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

// Fetches all posted transactions for the past 12 months, handling pagination.
export async function getTransactions(userId: string): Promise<BasiqTransaction[]> {
  const token = await getToken();

  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  const fromStr = from.toISOString().split("T")[0];

  const all: BasiqTransaction[] = [];
  let url: string | null =
    `${BASE_URL}/users/${userId}/transactions?filter=postDate.gte:${fromStr}&limit=500`;

  while (url) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "basiq-version": "3.0",
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Basiq transactions failed (${res.status}): ${body}`);
    }

    const data = await res.json();
    const items = (data.data ?? []) as BasiqTransaction[];

    // Only include posted (settled) transactions.
    all.push(...items.filter((t) => t.status === "posted"));

    url = (data.links?.next as string | undefined) ?? null;
  }

  return all;
}
