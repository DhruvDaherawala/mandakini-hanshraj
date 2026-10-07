export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export const errorMessage = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const r = await fetch(path, { ...options, headers, credentials: 'same-origin', cache: 'no-store' });
  const data = await r.json().catch(() => null) as T & {error?: {message?: string}};
  if (!r.ok) throw new ApiError(data?.error?.message || `Request failed (${r.status}).`, r.status);
  return data;
}
export function payload(record: object, creating = false) { return JSON.stringify(Object.fromEntries(Object.entries(record).filter(([k]) => !['_id','createdAt','updatedAt', ...(creating ? ['version'] : [])].includes(k)))); }
