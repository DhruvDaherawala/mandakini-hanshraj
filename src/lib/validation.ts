import { z } from 'zod';

export const idSchema = z.uuid();
const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const slugSchema = z.string().trim().toLowerCase().min(2).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(v => !uuidLike.test(v), 'Slugs cannot be UUIDs.');
export const keySchema = z.union([idSchema, slugSchema]);
const text = (n: number) => z.string().trim().max(n).refine(v => !v.includes('\u0000'), 'NUL is not allowed.');
const short = text(180).default('');
const unique = <T>(values: T[]) => new Set(values).size === values.length;
const strings = (max: number) => z.array(text(80).min(1)).max(max).refine(unique, 'Duplicate values.').default([]);
export const moneySchema = z.number().finite().min(0).max(10000000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.000001, 'Use at most two decimal places.');
const stock = z.number().int().min(0).max(1000000);
const sku = text(64).min(1).toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]*$/);
export const publicIdSchema = z.string().min(1).max(180).regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/);
function imageUrl(value: string) {
  if (/^\/(?:demo-assets|uploads|mandakini)\/[a-zA-Z0-9_./-]+\.webp$/.test(value)) return true;
  try { const u = new URL(value); return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/[^/]+\/image\/upload\//.test(u.pathname); } catch { return false; }
}
export const imageSchema = z.strictObject({ cloudinaryUrl: z.string().max(2000).refine(imageUrl, 'Use a registered Cloudinary, demo or uploaded image.'), cloudinaryPublicId: publicIdSchema, alt: text(240).default('') });
const images = (max: number) => z.array(imageSchema).max(max).refine(a => unique(a.map(x => x.cloudinaryPublicId)), 'Duplicate image.').default([]);
export function safeHref(v: string) {
  if (v === '') return true;
  if (/[\u0000-\u0020\\]/.test(v)) return false;
  if (v.startsWith('/')) return !v.startsWith('//') && !/%(?:2f|5c)/i.test(v.slice(0, 10));
  try { const u = new URL(v); return u.protocol === 'https:' && !u.username && !u.password; } catch { return false; }
}
const href = z.string().trim().max(2000).refine(v => v === '' || (v.startsWith('/') && safeHref(v)), 'Use a website path such as /shop.').default('');
const external = z.string().trim().max(2000).refine(v => v === '' || (v.startsWith('https://') && safeHref(v)), 'Use an HTTPS URL.').default('');
const variant = z.strictObject({ id: idSchema, size: text(80).default(''), color: text(80).default(''), sku: z.union([sku,z.literal('')]).default(''), price: moneySchema.optional(), stock, images: images(8) });
const baseProduct = z.strictObject({
  name: text(180).min(2), slug: slugSchema, description: text(15000).default(''), shortDescription: text(500).default(''), price: moneySchema,
  discountPrice: moneySchema.optional(), sku, category: idSchema, subcategory: short, images: images(12), thumbnail: z.number().int().min(0).max(11).default(0),
  sizes: strings(30), colors: strings(30), fabric: short, stock, status: z.enum(['active', 'draft']).default('draft'),
  featured: z.boolean().default(false), newArrival: z.boolean().default(false), bestseller: z.boolean().default(false), tags: strings(30),
  seoTitle: text(180).default(''), seoDescription: text(320).default(''),
  attributes: z.record(z.string().regex(/^[A-Za-z][A-Za-z0-9 _-]{0,39}$/).refine(k => !['constructor', 'prototype'].includes(k)), text(500)).refine(v => Object.keys(v).length <= 30, 'Too many attributes.').default({}),
  variants: z.array(variant).max(60).default([])
});
function productChecks(p: z.infer<typeof baseProduct>, ctx: z.RefinementCtx) {
  const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
  if (p.discountPrice !== undefined && p.discountPrice >= p.price) issue('discountPrice', 'Discount must be below the regular price.');
  if ((p.images.length === 0 && p.thumbnail !== 0) || (p.images.length > 0 && p.thumbnail >= p.images.length)) issue('thumbnail', 'Thumbnail must identify an image.');
  if (p.status === 'active' && !p.images.length) issue('images', 'Active products require an image.');
  if (!unique([p.sku, ...p.variants.map(v => v.sku).filter(Boolean)])) issue('variants', 'Parent and variant SKUs must all differ.');
  if (!unique(p.variants.map(v => v.id))) issue('variants', 'Duplicate variant ID.');
  if (!unique(p.variants.map(v => `${v.size}\u0000${v.color}`))) issue('variants', 'Duplicate size/color combination.');
  if (p.variants.length && p.stock !== p.variants.reduce((sum, v) => sum + v.stock, 0)) issue('stock', 'Stock must equal the sum of variant stock.');
  if (p.variants.some(v => (v.size && !p.sizes.includes(v.size)) || (v.color && !p.colors.includes(v.color)))) issue('variants', 'Variant sizes and colors must appear in the product lists.');
}
export const versionSchema = z.strictObject({ version: z.number().int().min(1) });
export const productCreateSchema = baseProduct.superRefine(productChecks);
export const productUpdateSchema = baseProduct.extend({ version: z.number().int().min(1) }).superRefine(productChecks);
const baseCategory = z.strictObject({ name: text(100).min(2), slug: slugSchema, description: text(2000).default(''), image: imageSchema.nullable().default(null), order: z.number().int().min(0).max(10000).default(0), active: z.boolean().default(true), seoTitle: short, seoDescription: text(320).default('') });
export const categoryCreateSchema = baseCategory;
export const categoryUpdateSchema = baseCategory.extend({ version: z.number().int().min(1) });
const ids = (max: number) => z.array(idSchema).max(max).refine(unique, 'Duplicate reference.').default([]);
export const contentSchema = z.strictObject({
  heroHeading: short, heroSubtitle: text(600).default(''), heroImage: imageSchema.nullable().default(null), heroCtaLabel: text(80).default(''), heroCtaHref: href,
  announcement: text(500).default(''), categoriesHeading: short, productsHeading: short, featuredCategories: ids(24), featuredProducts: ids(40),
  aboutHeading: short, aboutText: text(15000).default(''),
  artisans: z.array(z.strictObject({ name: short, role: short, location: short, image: imageSchema.nullable().default(null) })).max(24).default([]),
  banners: z.array(z.strictObject({ title: short, text: text(2000).default(''), ctaLabel: text(80).default(''), href, image: imageSchema.nullable().default(null) })).max(12).default([]),
  gallery: z.array(z.strictObject({ title: short, href, image: imageSchema.nullable().default(null) })).max(30).default([]), version: z.number().int().min(1)
});
export const settingsSchema = z.strictObject({
  businessName: text(180).min(1), tagline: short, logo: imageSchema.nullable().default(null), phone: text(50).default(''), whatsapp: z.string().regex(/^\+?[0-9]{7,15}$|^$/).default(''),
  email: z.union([z.email(), z.literal('')]).default(''), address: text(1000).default(''), instagram: external, facebook: external, businessHours: text(1000).default(''),
  footerText: text(2000).default(''), currency: z.string().toUpperCase().regex(/^[A-Z]{3}$/).default('INR'), seoTitle: short, seoDescription: text(320).default(''), version: z.number().int().min(1)
});
export const loginSchema = z.strictObject({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });
export const uploadDeleteSchema = z.strictObject({ cloudinaryPublicId: publicIdSchema });
export const duplicateSchema = z.strictObject({ version: z.number().int().min(1).optional() });
export const viewQuerySchema = z.strictObject({ admin: z.enum(['0', '1']).optional() });
const positiveQuery = (fallback: string, max: number) => z.string().regex(/^[1-9][0-9]*$/).default(fallback).transform(Number).pipe(z.number().int().min(1).max(max));
export const productsQuerySchema = z.strictObject({
  q: text(100).default(''), category: z.union([keySchema, z.literal(''), z.literal('all')]).default(''),
  status: z.enum(['active', 'draft', 'all']).optional(), stock: z.enum(['low', 'out', 'in', 'all']).optional(),
  featured: z.enum(['0','1']).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'name']).default('newest'), page: positiveQuery('1', 100000), limit: positiveQuery('12', 20), admin: z.enum(['0', '1']).optional()
});
export type ProductInput = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;
export type CategoryInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

