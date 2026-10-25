const fallbackBaseUrl = "http://localhost:3002";

export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window === "undefined" ? fallbackBaseUrl : "");

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    // keep the server's explanation (e.g. a rejected reliability profile) for the user
    const body = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = Array.isArray(body?.message) ? body.message.join("; ") : body?.message;
    throw new Error(`API error: ${response.status}${typeof message === "string" && message ? ` — ${message}` : ""}`);
  }

  return response.json() as Promise<T>;
}
