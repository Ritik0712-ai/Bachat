export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
let csrfToken: string | undefined;
let csrfPromise: Promise<string> | undefined;
export async function getCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise)
    csrfPromise = fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not connect. Please try again.');
        const j = await r.json();
        csrfToken = j.data.token;
        return csrfToken!;
      })
      .finally(() => {
        csrfPromise = undefined;
      });
  return csrfPromise;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; key?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrf();
  if (options.key) headers['Idempotency-Key'] = options.key;
  let response: Response;
  try {
    response = await fetch('/api/v1' + path, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal || AbortSignal.timeout(15000),
    });
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      method === 'GET'
        ? "We couldn't connect. Check your connection and retry."
        : 'The request could not be confirmed. Retry the same submission to check its outcome.',
    );
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok) {
    const error = result.error || {};
    if (error.code === 'CSRF_EXPIRED' || error.code === 'CSRF_INVALID') csrfToken = undefined;
    if (response.status === 401 && !path.startsWith('/auth/'))
      window.dispatchEvent(new CustomEvent('bachat:expired'));
    const message =
      response.status === 429
        ? `Too many attempts. Try again in ${response.headers.get('Retry-After') || 60} seconds.`
        : error.message;
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN_ERROR',
      message || 'Something went wrong. Please try again.',
      error.fields,
    );
  }
  return result.data as T;
}
export const financeChannel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('bachat-finance') : null;
export const notifyChange = () => financeChannel?.postMessage({ type: 'changed' });
