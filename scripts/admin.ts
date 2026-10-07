import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { tables, closeDatabase } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';
import { GUARD_ID } from '../src/lib/defaults';

async function main() {
  if (process.argv.slice(2).join(' ') !== '--create') throw new Error('Explicit opt-in required: npm run bootstrap:admin -- --create');
  const input = z.strictObject({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(12).max(128) }).parse({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  const t = await tables();
  if (!await t.guards.findOne({ _id: GUARD_ID })) throw new Error('Run npm run setup:db first.');
  if (await t.admins.findOne({ email: input.email })) throw new Error('Administrator already exists. This script never overwrites an account.');
  await t.admins.insertOne({ _id: randomUUID(), email: input.email, passwordHash: await hashPassword(input.password), active: true, sessionVersion: 1, createdAt: new Date() });
  console.log('Administrator created. Remove ADMIN_PASSWORD from the environment now. No password was logged.');
}
main().catch(error => { console.error(error instanceof z.ZodError ? 'Invalid ADMIN_EMAIL or ADMIN_PASSWORD; password must contain 12–128 characters.' : error instanceof Error ? error.message : 'Administrator bootstrap failed.'); process.exitCode = 1; }).finally(closeDatabase);

