// Ollama HTTP client — thin wrapper around the local /api/generate endpoint.
//
// Configuration (set in .env.local):
//   OLLAMA_BASE_URL   Base URL for the Ollama server   (default: http://localhost:11434)
//   OLLAMA_MODEL      Model name to use                 (default: mistral)
//   OLLAMA_ENABLED    Set to "false" to disable layer   (default: true)
//
// The layer is opt-in: if OLLAMA_ENABLED is anything other than "true",
// or if the server is unreachable, all calls return null and the app continues normally.

const BASE_URL   = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL      = process.env.OLLAMA_MODEL    ?? "mistral";
const ENABLED    = process.env.OLLAMA_ENABLED  === "true";
const TIMEOUT_MS = 8_000;

export function isOllamaEnabled(): boolean {
  return ENABLED;
}

type GenerateResponse = {
  response?: string;
  error?:    string;
};

/**
 * Send a prompt to the local Ollama server and return the raw text response.
 * Returns null on any failure: timeout, connection error, bad status, or missing response.
 * Never throws.
 */
export async function ollamaGenerate(prompt: string): Promise<string | null> {
  if (!ENABLED) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/api/generate`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ model: MODEL, prompt, stream: false, format: "json" }),
      signal:  controller.signal,
    });

    if (!res.ok) {
      console.warn(`[ollama] HTTP ${res.status} — skipping refinement`);
      return null;
    }

    const data = (await res.json()) as GenerateResponse;

    if (data.error) {
      console.warn(`[ollama] Model error: ${data.error}`);
      return null;
    }

    return data.response ?? null;
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    if ((err as Error).name === "AbortError") {
      console.warn("[ollama] Request timed out after 8s — skipping refinement");
    } else {
      console.warn(`[ollama] Unavailable (${msg}) — skipping refinement`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
