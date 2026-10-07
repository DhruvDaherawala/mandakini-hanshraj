import 'server-only';
import { fail } from './errors';

export const SESSION_COOKIE = 'riwayat_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const JSON_LIMIT = 512 * 1024;
export const UPLOAD_LIMIT = 4 * 1024 * 1024;
export const LOW_STOCK = 5;
export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(503, 'CONFIGURATION_REQUIRED', `Missing server configuration: ${name}`);
  return value;
}
export function appOrigin(): string {
  let url: URL;
  try { url = new URL(required('APP_URL')); } catch { return fail(503, 'CONFIGURATION_REQUIRED', 'APP_URL must be a valid origin.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash || (process.env.NODE_ENV === 'production' && url.protocol !== 'https:'))
    fail(503, 'CONFIGURATION_REQUIRED', 'APP_URL must be an HTTP origin, or HTTPS in production, without a path.');
  return url.origin;
}
export function dbConfig() {
  const uri = required('MONGODB_URI'), name = required('MONGODB_DB');
  if (!/^mongodb(?:\+srv)?:\/\//.test(uri) || !/^[A-Za-z0-9_-]{1,64}$/.test(name)) fail(503, 'CONFIGURATION_REQUIRED', 'Invalid MongoDB configuration.');
  return { uri, name };
}

