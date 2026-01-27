const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
}

type ApiOptions = RequestInit & {
  idempotencyKey?: string;
  confirmationId?: string;
};

async function parseError(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const data = (await res.json()) as {
        message?: string;
        error?: string;
      };
      const message = data.message || data.error;
      if (message) return message;
    } catch {
      // fallthrough to text
    }
  }
  const text = await res.text().catch(() => "");
  return text || res.statusText || "Request failed";
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { idempotencyKey, confirmationId, headers, ...rest } = options;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      ...(confirmationId ? { "Confirmation-Id": confirmationId } : {}),
      ...(headers || {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await parseError(res);
    throw new Error(`API ${res.status}: ${message}`);
  }

  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
