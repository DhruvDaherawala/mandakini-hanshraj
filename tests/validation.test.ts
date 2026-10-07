import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { productCreateSchema, productUpdateSchema, productsQuerySchema, categoryCreateSchema, contentSchema, imageSchema, safeHref } from '../src/lib/validation';
import { defaultContent } from '../src/lib/defaults';

const image = { cloudinaryUrl: '/demo-assets/product-1.webp', cloudinaryPublicId: 'demo/product-1', alt: 'Demo' };
const base = () => ({ name: 'Test product', slug: 'test-product', price: 120.25, sku: 'test-1', category: randomUUID(), stock: 0, images: [image], status: 'active' as const });
test('normalizes SKU and materializes defaults', () => { const p = productCreateSchema.parse(base()); assert.equal(p.sku, 'TEST-1'); assert.equal(p.thumbnail, 0); assert.deepEqual(p.variants, []); });
test('rejects unknown fields and server-managed metadata', () => { for (const key of ['_id', 'createdAt', 'version', 'admin']) assert.equal(productCreateSchema.safeParse({ ...base(), [key]: 'x' }).success, false); });
test('money must be finite, nonnegative and at most two decimals', () => { for (const price of [-1, 0.001, 1.234, Infinity, NaN]) assert.equal(productCreateSchema.safeParse({ ...base(), price }).success, false); assert.equal(productCreateSchema.safeParse({ ...base(), price: 19.99 }).success, true); });
test('stock is a nonnegative integer', () => { for (const stock of [-1, 0.5]) assert.equal(productCreateSchema.safeParse({ ...base(), stock }).success, false); });
test('active products need an image and a valid thumbnail', () => { assert.equal(productCreateSchema.safeParse({ ...base(), images: [] }).success, false); assert.equal(productCreateSchema.safeParse({ ...base(), thumbnail: 1 }).success, false); });
test('discount must be below price', () => { assert.equal(productCreateSchema.safeParse({ ...base(), discountPrice: 120.25 }).success, false); });
test('variant sum, SKU, IDs and combinations are checked', () => {
  const v = { id: randomUUID(), size: 'S', color: 'Red', sku: 'TEST-S', stock: 2, images: [] };
  const p = { ...base(), sizes: ['S', 'M'], colors: ['Red'], variants: [v], stock: 2 };
  assert.equal(productCreateSchema.safeParse(p).success, true);
  assert.equal(productCreateSchema.safeParse({ ...p, stock: 3 }).success, false);
  assert.equal(productCreateSchema.safeParse({ ...p, variants: [{ ...v, sku: 'test-1' }] }).success, false);
  assert.equal(productCreateSchema.safeParse({ ...p, stock: 4, variants: [v, { ...v, sku: 'TEST-M', size: 'M' }] }).success, false);
  assert.equal(productCreateSchema.safeParse({ ...p, stock: 4, variants: [v, { ...v, id: randomUUID(), sku: 'TEST-S2' }] }).success, false);
});
test('variation SKUs are optional but nonempty SKUs remain unique', () => {
  const p = {...base(),stock:2,sizes:['S','M'],colors:['Red'],variants:[{id:randomUUID(),size:'S',color:'Red',sku:'',stock:1,images:[]},{id:randomUUID(),size:'M',color:'Red',sku:'',stock:1,images:[]}]};
  assert.equal(productCreateSchema.safeParse(p).success,true);
});
test('updates require version', () => { assert.equal(productUpdateSchema.safeParse(base()).success, false); assert.equal(productUpdateSchema.safeParse({ ...base(), version: 1 }).success, true); });
test('query bounds, enums and unknown fields are strict', () => {
  assert.equal(productsQuerySchema.parse({}).limit, 12);
  for (const q of [{ limit: '21' }, { limit: '0' }, { page: '-1' }, { page: '1.5' }, { admin: 'true' }, { status: 'deleted' }, { secret: '1' }]) assert.equal(productsQuerySchema.safeParse(q).success, false);
  assert.equal(productsQuerySchema.parse({ limit: '20', stock: 'low', sort: 'price-asc' }).limit, 20);
});
test('dangerous URLs and forged image hosts are rejected', () => {
  for (const href of ['javascript:alert(1)', '//evil.example', '/\\evil.example', '/%2fexample', 'http://example.com']) assert.equal(safeHref(href), false);
  assert.equal(safeHref('/products?category=sarees'), true);
  assert.equal(imageSchema.safeParse({ ...image, cloudinaryUrl: 'https://evil.example/image.webp' }).success, false);
});
test('content reference lists cannot contain duplicates', () => { const id = randomUUID(); assert.equal(contentSchema.safeParse({ ...defaultContent, featuredProducts: [id, id] }).success, false); });
test('category and attributes reject unsafe input', () => {
  assert.equal(categoryCreateSchema.safeParse({ name: 'Test', slug: 'test', active: 'false' }).success, false);
  assert.equal(productCreateSchema.safeParse({ ...base(), attributes: { '$where': 'x' } }).success, false);
  assert.equal(productCreateSchema.safeParse({ ...base(), attributes: { constructor: 'x' } }).success, false);
});

