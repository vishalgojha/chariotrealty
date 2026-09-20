const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://api.chariotrealty.in").replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${apiBase}${path}`;
}

export async function readJson(response: Response): Promise<Record<string, any>> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(response.ok ? "The API returned an invalid response." : `API request failed (${response.status}). Check the Chariot API deployment.`);
  }
  return response.json();
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
}