// Ollama HTTP client — thin wrapper around the local /api/generate endpoint.
//
// Configuration (set in .env.local):
//   OLLAMA_BASE_URL   Base URL for the Ollama server   (default: http://localhost:11434)
//   OLLAMA_MODEL      Model name to use                 (default: mistral)
//   OLLAMA_ENABLED    Set to "true" to enable           (default: false)
//
// Returns null on any failure — timeout, connection error, or bad response.
// The rest of the app never sees an exception from this module.

const BASE_URL   = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const MODEL      = process.env.OLLAMA_MODEL    ?? "mistral";
const ENABLED    = process.env.OLLAMA_ENABLED  === "true";
const TIMEOUT_MS = 8_000;

type GenerateResponse = { response?: string; error?: string };

/**
 * Send a prompt to Ollama and return the raw response string.
 * Returns null if disabled, unavailable, timed out, or on any error.
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
    if ((err as Error).name === "AbortError") {
      console.warn("[ollama] Timed out after 8s — skipping refinement");
    } else {
      console.warn(`[ollama] Unavailable (${(err as Error).message}) — skipping refinement`);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
