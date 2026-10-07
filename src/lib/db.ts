import 'server-only';
import { MongoClient, type ClientSession } from 'mongodb';
import type { Product, Category, SiteContent, SiteSettings, ImageAsset } from '../types';
import { dbConfig } from './config';
import { fail } from './errors';
import { CONTENT_ID, SETTINGS_ID, GUARD_ID, defaultContent, defaultSettings } from './defaults';

type WithId<T> = T & { _id: string };
export type AdminDoc = { _id: string; email: string; passwordHash: string; active: boolean; sessionVersion: number; createdAt: Date };
export type SessionDoc = { _id: string; tokenHash: string; adminId: string; sessionVersion: number; createdAt: Date; expiresAt: Date };
export type MediaDoc = WithId<ImageAsset> & { kind: 'cloudinary' | 'local'; state: 'active' | 'deleting'; createdAt: Date };
declare global { var riwayatMongo: Promise<MongoClient> | undefined; }
export function client(): Promise<MongoClient> {
  if (!globalThis.riwayatMongo) {
    const c = new MongoClient(dbConfig().uri, { maxPoolSize: 15, serverSelectionTimeoutMS: 5000, retryWrites: true });
    globalThis.riwayatMongo = c.connect().catch(error => { globalThis.riwayatMongo = undefined; throw error; });
  }
  return globalThis.riwayatMongo;
}
export async function tables() {
  const db = (await client()).db(dbConfig().name);
  return {
    db, products: db.collection<Product>('products'), categories: db.collection<Category>('categories'),
    content: db.collection<WithId<SiteContent>>('content'), settings: db.collection<WithId<SiteSettings>>('settings'),
    admins: db.collection<AdminDoc>('admins'), sessions: db.collection<SessionDoc>('sessions'),
    rates: db.collection<{ _id: string; key: string; count: number; expiresAt: Date }>('loginRates'),
    skus: db.collection<{ _id: string; sku: string; productId: string }>('skus'), media: db.collection<MediaDoc>('media'),
    guards: db.collection<{ _id: string; revision: number }>('guards')
  };
}
export type Tables = Awaited<ReturnType<typeof tables>>;
export async function catalogTransaction<T>(fn: (t: Tables, session: ClientSession) => Promise<T>): Promise<T> {
  const t = await tables(), session = (await client()).startSession();
  try {
    return await session.withTransaction(async () => {
      // First write establishes a single serialization point for every catalog/reference mutation.
      const lock = await t.guards.updateOne({ _id: GUARD_ID }, { $inc: { revision: 1 } }, { session });
      if (!lock.matchedCount) fail(503, 'DATABASE_NOT_INITIALIZED', 'Run the database setup script first.');
      return fn(t, session);
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 10000 });
  } finally { await session.endSession(); }
}
export async function setupDatabase() {
  const t = await tables(), hello = await t.db.command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') fail(503, 'TRANSACTIONS_REQUIRED', 'Use Atlas or a MongoDB replica set.');
  // Index operations are outside transactions. Do not parallelize operations inside catalogTransaction.
  await t.products.createIndex({ slug: 1 }, { unique: true });
  await t.products.createIndex({ sku: 1 }, { unique: true });
  await t.products.createIndex({ name: 'text', description: 'text', tags: 'text', sku: 'text' }, { name: 'catalog_search', default_language: 'none' });
  await t.products.createIndex({ status: 1, category: 1, createdAt: -1 });
  await t.products.createIndex({ status: 1, price: 1 });
  await t.products.createIndex({ status: 1, featured: 1, createdAt: -1 });
  await t.products.createIndex({ category: 1 });
  await t.categories.createIndex({ slug: 1 }, { unique: true });
  await t.categories.createIndex({ active: 1, order: 1 });
  await t.skus.createIndex({ sku: 1 }, { unique: true });
  await t.skus.createIndex({ productId: 1 });
  await t.media.createIndex({ cloudinaryPublicId: 1 }, { unique: true });
  await t.admins.createIndex({ email: 1 }, { unique: true });
  await t.sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await t.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await t.sessions.createIndex({ adminId: 1 });
  await t.rates.createIndex({ key: 1 }, { unique: true });
  await t.rates.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await t.guards.updateOne({ _id: GUARD_ID }, { $setOnInsert: { _id: GUARD_ID, revision: 0 } }, { upsert: true });
  await catalogTransaction(async (x, session) => {
    await x.content.updateOne({ _id: CONTENT_ID }, { $setOnInsert: { _id: CONTENT_ID, ...defaultContent } }, { upsert: true, session });
    await x.settings.updateOne({ _id: SETTINGS_ID }, { $setOnInsert: { _id: SETTINGS_ID, ...defaultSettings } }, { upsert: true, session });
    return true;
  });
}
export async function closeDatabase() {
  const pending = globalThis.riwayatMongo; globalThis.riwayatMongo = undefined;
  if (pending) await (await pending).close();
}

