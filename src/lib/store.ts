import 'server-only';
import { randomUUID } from 'node:crypto';
import { connection } from 'next/server';
import type { ClientSession, Document, Filter } from 'mongodb';
import type { Product, Category, SiteContent, SiteSettings, PageResult } from '../types';
import { tables, catalogTransaction, type Tables } from './db';
import { requireAdmin } from './auth';
import { fail } from './errors';
import { LOW_STOCK } from './config';
import { CONTENT_ID, SETTINGS_ID } from './defaults';
import { assertAssets, productAssets, contentAssets, settingsAssets } from './references';
import { idSchema, keySchema, productCreateSchema, productUpdateSchema, categoryCreateSchema, categoryUpdateSchema, contentSchema, settingsSchema, productsQuerySchema, type ProductInput, type ProductUpdate, type CategoryInput, type CategoryUpdate } from './validation';

async function view(admin: boolean) { await connection(); if (admin) await requireAdmin(); }
function stripId<T extends { _id: string }>(doc: T): Omit<T, '_id'> { const { _id, ...value } = doc; return value; }
function expected(actual: number, supplied: number) { if (actual !== supplied) fail(409, 'VERSION_CONFLICT', 'This record changed. Reload it before saving or deleting.'); }
function activeCategoryStages(): Document[] { return [{ $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: '__category' } }, { $match: { '__category.active': true } }, { $project: { __category: 0 } }]; }
async function categoryForProduct(t: Tables, session: ClientSession, p: ProductInput) {
  const c = await t.categories.findOne({ _id: p.category }, { session });
  if (!c || (p.status === 'active' && !c.active)) fail(422, 'INVALID_CATEGORY', 'Choose an existing category; active products require an active category.');
}
async function reserveSkus(t: Tables, session: ClientSession, p: Product) {
  // Preserve unchanged reservations rather than deleting/reinserting unique keys in one transaction.
  const wanted = new Set([p.sku, ...p.variants.map(v => v.sku).filter(Boolean)]);
  const existing = await t.skus.find({ productId: p._id }, { session }).toArray();
  const held = new Set(existing.map(x => x.sku));
  const removed = existing.filter(x => !wanted.has(x.sku)).map(x => x._id);
  if (removed.length) await t.skus.deleteMany({ _id: { $in: removed } }, { session });
  const added = [...wanted].filter(sku => !held.has(sku));
  if (added.length) await t.skus.insertMany(added.map(sku => ({ _id: randomUUID(), sku, productId: p._id })), { session });
}
export async function getCategories(admin = false): Promise<Category[]> {
  await view(admin); return (await tables()).categories.find(admin ? {} : { active: true }).sort({ order: 1, name: 1, _id: 1 }).toArray();
}
export async function getCategory(key: string, admin = false): Promise<Category | null> {
  await view(admin); key = keySchema.parse(key);
  return (await tables()).categories.findOne({ $or: [{ _id: key }, { slug: key }], ...(admin ? {} : { active: true }) });
}
export async function getProducts(query: Record<string, string> = {}): Promise<PageResult> {
  const q = productsQuerySchema.parse(query), admin = q.admin === '1'; await view(admin);
  if (!admin && q.status === 'draft') fail(403, 'FORBIDDEN_FILTER', 'Draft products require administrator access.');
  const t = await tables(), filter: Filter<Product> = {};
  if (!admin) filter.status = 'active'; else if (q.status && q.status !== 'all') filter.status = q.status;
  if (q.q) {
    const escaped = q.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    const matchingCategories = await t.categories.find({ name: rx, ...(admin ? {} : {active:true}) }, {projection:{_id:1}}).limit(1000).toArray();
    filter.$or = [{name:rx},{sku:rx},{tags:rx},{'variants.sku':rx},{category:{$in:matchingCategories.map(c=>c._id)}}];
  }
  if (q.featured === '1') filter.featured = true;
  if (q.stock === 'out') filter.stock = 0;
  if (q.stock === 'low') filter.stock = { $gt: 0, $lte: LOW_STOCK };
  if (q.stock === 'in') filter.stock = { $gt: 0 };
  if (q.category && q.category !== 'all') {
    const category = await t.categories.findOne({ $or: [{ _id: q.category }, { slug: q.category }], ...(admin ? {} : { active: true }) });
    if (!category) return { items: [], total: 0, page: q.page, pages: 1 };
    filter.category = category._id;
  }
  const sorts: Record<string, Document> = { newest: { createdAt: -1, _id: 1 }, 'price-asc': { price: 1, _id: 1 }, 'price-desc': { price: -1, _id: 1 }, name: { name: 1, _id: 1 } };
  const pipeline: Document[] = [{ $match: filter }, ...(admin ? [] : activeCategoryStages()), { $facet: { items: [{ $sort: sorts[q.sort] }, { $skip: (q.page - 1) * q.limit }, { $limit: q.limit }], count: [{ $count: 'total' }] } }];
  const result = await t.products.aggregate<{ items: Product[]; count: { total: number }[] }>(pipeline, { maxTimeMS: 5000 }).next();
  const total = result?.count[0]?.total ?? 0;
  return { items: result?.items ?? [], total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) };
}
export async function getProductRecord(key: string, admin = false): Promise<Product | null> {
  await view(admin); key = keySchema.parse(key);
  const filter = { $or: [{ _id: key }, { slug: key }], ...(admin ? {} : { status: 'active' }) };
  return (await tables()).products.aggregate<Product>([{ $match: filter }, ...(admin ? [] : activeCategoryStages()), { $limit: 1 }], { maxTimeMS: 5000 }).next();
}
export async function getProduct(slug: string): Promise<Product | null> { return getProductRecord(slug, false); }
export async function getSettings(admin = false): Promise<SiteSettings> {
  await view(admin); const doc = await (await tables()).settings.findOne({ _id: SETTINGS_ID });
  if (!doc) fail(503, 'DATABASE_NOT_INITIALIZED', 'Run the database setup script first.');
  return stripId(doc);
}
export async function getContent(admin = false): Promise<SiteContent> {
  await view(admin); const t = await tables(), doc = await t.content.findOne({ _id: CONTENT_ID });
  if (!doc) fail(503, 'DATABASE_NOT_INITIALIZED', 'Run the database setup script first.');
  const content = stripId(doc);
  if (!admin) {
    const categories = await t.categories.find({ _id: { $in: content.featuredCategories }, active: true }, { projection: { _id: 1 } }).toArray();
    const products = await t.products.aggregate<{ _id: string }>([{ $match: { _id: { $in: content.featuredProducts }, status: 'active' } }, ...activeCategoryStages(), { $project: { _id: 1 } }]).toArray();
    const cs = new Set(categories.map(c => c._id)), ps = new Set(products.map(p => p._id));
    content.featuredCategories = content.featuredCategories.filter(id => cs.has(id)); content.featuredProducts = content.featuredProducts.filter(id => ps.has(id));
  }
  return content;
}
export async function createProduct(input: ProductInput): Promise<Product> {
  await requireAdmin(); const data = productCreateSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    await categoryForProduct(t, session, data); await assertAssets(t, session, productAssets(data));
    const now = new Date().toISOString(), p: Product = { ...data, _id: randomUUID(), createdAt: now, updatedAt: now, version: 1 };
    await reserveSkus(t, session, p); await t.products.insertOne(p, { session }); return p;
  });
}
export async function updateProduct(id: string, input: ProductUpdate): Promise<Product> {
  await requireAdmin(); idSchema.parse(id); const { version, ...data } = productUpdateSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    const previous = await t.products.findOne({ _id: id }, { session }); if (!previous) fail(404, 'NOT_FOUND', 'Product not found.'); expected(previous.version, version);
    await categoryForProduct(t, session, data); await assertAssets(t, session, productAssets(data));
    const p: Product = { ...data, _id: id, createdAt: previous.createdAt, updatedAt: new Date().toISOString(), version: version + 1 };
    await reserveSkus(t, session, p); await t.products.replaceOne({ _id: id, version }, p, { session }); return p;
  });
}
export async function deleteProduct(id: string, version: number) {
  await requireAdmin(); idSchema.parse(id);
  return catalogTransaction(async (t, session) => {
    const p = await t.products.findOne({ _id: id }, { session }); if (!p) fail(404, 'NOT_FOUND', 'Product not found.'); expected(p.version, version);
    if (await t.content.findOne({ featuredProducts: id }, { session })) fail(409, 'PRODUCT_REFERENCED', 'Remove this product from featured content before deleting it.');
    await t.products.deleteOne({ _id: id, version }, { session }); await t.skus.deleteMany({ productId: id }, { session }); return { ok: true };
  });
}
export async function duplicateProduct(id: string, version?: number): Promise<Product> {
  await requireAdmin(); idSchema.parse(id);
  return catalogTransaction(async (t, session) => {
    const source = await t.products.findOne({ _id: id }, { session }); if (!source) fail(404, 'NOT_FOUND', 'Product not found.'); if (version !== undefined) expected(source.version, version);
    const suffix = randomUUID().slice(0, 8), now = new Date().toISOString();
    const p: Product = { ...source, _id: randomUUID(), name: `${source.name.slice(0, 173)} (Copy)`, slug: `${source.slug.slice(0, 140).replace(/-+$/, '')}-copy-${suffix}`, sku: `${source.sku.slice(0, 40)}-COPY-${suffix.toUpperCase()}`, status: 'draft', featured: false, bestseller: false, newArrival: false, createdAt: now, updatedAt: now, version: 1,
      variants: source.variants.map((v, i) => ({ ...v, id: randomUUID(), sku: `${source.sku.slice(0, 35)}-V${i + 1}-COPY-${suffix.toUpperCase()}` })) };
    await assertAssets(t, session, productAssets(p)); await reserveSkus(t, session, p); await t.products.insertOne(p, { session }); return p;
  });
}
export async function createCategory(input: CategoryInput): Promise<Category> {
  await requireAdmin(); const data = categoryCreateSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    await assertAssets(t, session, data.image ? [data.image] : []); const c: Category = { ...data, _id: randomUUID(), version: 1 }; await t.categories.insertOne(c, { session }); return c;
  });
}
export async function updateCategory(id: string, input: CategoryUpdate): Promise<Category> {
  await requireAdmin(); idSchema.parse(id); const { version, ...data } = categoryUpdateSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    const previous = await t.categories.findOne({ _id: id }, { session }); if (!previous) fail(404, 'NOT_FOUND', 'Category not found.'); expected(previous.version, version);
    await assertAssets(t, session, data.image ? [data.image] : []); const c: Category = { ...data, _id: id, version: version + 1 }; await t.categories.replaceOne({ _id: id, version }, c, { session }); return c;
  });
}
export async function deleteCategory(id: string, version: number) {
  await requireAdmin(); idSchema.parse(id);
  return catalogTransaction(async (t, session) => {
    const c = await t.categories.findOne({ _id: id }, { session }); if (!c) fail(404, 'NOT_FOUND', 'Category not found.'); expected(c.version, version);
    if (await t.products.findOne({ category: id }, { session }) || await t.content.findOne({ featuredCategories: id }, { session })) fail(409, 'CATEGORY_IN_USE', 'Move all products and remove featured references before deleting this category.');
    await t.categories.deleteOne({ _id: id, version }, { session }); return { ok: true };
  });
}
export async function updateContent(input: SiteContent): Promise<SiteContent> {
  await requireAdmin(); const data = contentSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    const old = await t.content.findOne({ _id: CONTENT_ID }, { session }); if (!old) fail(503, 'DATABASE_NOT_INITIALIZED', 'Run database setup.'); expected(old.version, data.version);
    await assertAssets(t, session, contentAssets(data));
    const cats = await t.categories.countDocuments({ _id: { $in: data.featuredCategories }, active: true }, { session });
    const products = await t.products.aggregate<{ count: number }>([{ $match: { _id: { $in: data.featuredProducts }, status: 'active' } }, ...activeCategoryStages(), { $count: 'count' }], { session }).next();
    if (cats !== data.featuredCategories.length || (products?.count ?? 0) !== data.featuredProducts.length) fail(422, 'INVALID_FEATURED_REFERENCE', 'Featured references must identify public active products and categories.');
    const value = { ...data, version: data.version + 1 }; await t.content.replaceOne({ _id: CONTENT_ID, version: data.version }, value, { session }); return value;
  });
}
export async function updateSettings(input: SiteSettings): Promise<SiteSettings> {
  await requireAdmin(); const data = settingsSchema.parse(input);
  return catalogTransaction(async (t, session) => {
    const old = await t.settings.findOne({ _id: SETTINGS_ID }, { session }); if (!old) fail(503, 'DATABASE_NOT_INITIALIZED', 'Run database setup.'); expected(old.version, data.version);
    await assertAssets(t, session, settingsAssets(data)); const value = { ...data, version: data.version + 1 };
    await t.settings.replaceOne({ _id: SETTINGS_ID, version: data.version }, value, { session }); return value;
  });
}
export async function dashboard() {
  await requireAdmin(); const t = await tables();
  const [total, active, outOfStock, lowStock, categories, featured, recent] = await Promise.all([
    t.products.countDocuments(), t.products.countDocuments({ status: 'active' }), t.products.countDocuments({ stock: 0 }), t.products.countDocuments({ stock: { $gt: 0, $lte: LOW_STOCK } }),
    t.categories.countDocuments(), t.products.countDocuments({ featured: true }), t.products.find().sort({ updatedAt: -1, _id: 1 }).limit(6).toArray()
  ]);
  return { total, active, outOfStock, lowStock, categories, featured, recent };
}

