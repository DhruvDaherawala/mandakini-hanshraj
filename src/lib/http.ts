import 'server-only';
import { z, ZodError } from 'zod';
import { HttpError, fail } from './errors';
import { JSON_LIMIT, UPLOAD_LIMIT } from './config';

export function response(value: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store, max-age=0', 'Pragma': 'no-cache', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
export function errorResponse(error: unknown): Response {
  if (error instanceof ZodError) return response({ error: { code: 'VALIDATION_ERROR', message: error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).slice(0, 4).join('; ') } }, 422);
  if (error instanceof HttpError) return response({ error: { code: error.code, message: error.message } }, error.status, error.headers);
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) return response({ error: { code: 'DUPLICATE_VALUE', message: 'A slug or SKU is already in use.' } }, 409);
  console.error('Request failed', error instanceof Error ? error.name : 'UnknownError');
  return response({ error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed. Please try again.' } }, 500);
}
export function query(request: Request): Record<string, string> {
  const output: Record<string, string> = Object.create(null), params = new URL(request.url).searchParams;
  for (const [key, value] of params) { if (Object.hasOwn(output, key)) fail(400, 'DUPLICATE_QUERY', 'Query parameters cannot be repeated.'); output[key] = value; }
  return output;
}
export function noQuery(request: Request) { z.strictObject({}).parse(query(request)); }
async function bytes(request: Request, limit: number): Promise<Uint8Array> {
  const encoding = request.headers.get('content-encoding');
  if (encoding && encoding !== 'identity') fail(415, 'UNSUPPORTED_ENCODING', 'Compressed request bodies are not supported.');
  const length = request.headers.get('content-length');
  if (length && (!/^[0-9]+$/.test(length) || !Number.isSafeInteger(Number(length)))) fail(400, 'INVALID_LENGTH', 'Invalid Content-Length.');
  if (length && Number(length) > limit) fail(413, 'BODY_TOO_LARGE', 'Request body is too large.');
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(), parts: Uint8Array[] = []; let total = 0;
  const deadline = Date.now() + 20000;
  try {
    while (true) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const item = await Promise.race([reader.read(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new HttpError(408, 'BODY_TIMEOUT', 'Request body timed out.')), Math.max(1, deadline - Date.now())); })]).finally(() => { if (timer) clearTimeout(timer); });
      if (item.done) break;
      total += item.value.byteLength; if (total > limit) fail(413, 'BODY_TOO_LARGE', 'Request body is too large.'); parts.push(item.value);
    }
  } catch (error) { void reader.cancel().catch(() => undefined); throw error; }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0; for (const part of parts) { result.set(part, offset); offset += part.length; } return result;
}
export async function json<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) fail(415, 'CONTENT_TYPE_REQUIRED', 'Use application/json.');
  const raw = await bytes(request, JSON_LIMIT); let value: unknown;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); } catch { return fail(400, 'INVALID_JSON', 'The request body is not valid JSON.'); }
  return schema.parse(value);
}
export async function uploadForm(request: Request): Promise<{ bytes: Buffer; mime: string; alt: string }> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) fail(415, 'CONTENT_TYPE_REQUIRED', 'Use multipart/form-data.');
  const raw = await bytes(request, UPLOAD_LIMIT + 64 * 1024); let form: FormData;
  try { form = await new Response(raw.buffer as ArrayBuffer, { headers: { 'Content-Type': contentType } }).formData(); }
  catch { return fail(400, 'INVALID_FORM', 'Invalid multipart form.'); }
  for (const key of form.keys()) if (!['file', 'alt'].includes(key)) fail(422, 'VALIDATION_ERROR', 'Only file and alt fields are allowed.');
  if (form.getAll('file').length !== 1 || form.getAll('alt').length > 1) fail(422, 'VALIDATION_ERROR', 'Supply exactly one file and at most one alt field.');
  const file = form.get('file'), alt = z.string().trim().max(240).parse(form.get('alt') ?? '');
  if (!file || typeof file === 'string') fail(422, 'VALIDATION_ERROR', 'Supply one image file.');
  if (file.size > UPLOAD_LIMIT) fail(413, 'IMAGE_TOO_LARGE', 'Images must be at most 4 MiB.');
  return { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type.toLowerCase(), alt };
}

