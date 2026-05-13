const DEFAULT_TIMEOUT_MS = 20_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchInit } = init ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...fetchInit, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out. Check your connection and try again.");
      }
      // Network failures: "Failed to fetch" (Chrome), "Load failed" (Safari/WKWebView), "Network request failed"
      if (
        err.name === "TypeError" ||
        err.message === "Failed to fetch" ||
        err.message === "Load failed" ||
        err.message === "Network request failed" ||
        err.message.includes("NetworkError")
      ) {
        throw new Error("You're offline. Please check your connection and try again.");
      }
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
