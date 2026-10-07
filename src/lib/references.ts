import 'server-only';
import type { ClientSession } from 'mongodb';
import type { Product, SiteContent, SiteSettings, ImageAsset } from '../types';
import type { Tables } from './db';
import { fail } from './errors';

export const productAssets = (p: Pick<Product, 'images' | 'variants'>): ImageAsset[] => [...p.images, ...p.variants.flatMap(v => v.images)];
export const contentAssets = (c: SiteContent): ImageAsset[] => [c.heroImage, ...c.artisans.map(x => x.image), ...c.banners.map(x => x.image), ...c.gallery.map(x => x.image)].filter((x): x is ImageAsset => x !== null);
export const settingsAssets = (s: SiteSettings): ImageAsset[] => s.logo ? [s.logo] : [];
export async function assertAssets(t: Tables, session: ClientSession, assets: ImageAsset[]) {
  if (!assets.length) return;
  const ids = [...new Set(assets.map(a => a.cloudinaryPublicId))];
  const records = await t.media.find({ cloudinaryPublicId: { $in: ids }, state: 'active' }, { session }).toArray();
  const registry = new Map(records.map(a => [a.cloudinaryPublicId, a.cloudinaryUrl]));
  for (const a of assets) if (registry.get(a.cloudinaryPublicId) !== a.cloudinaryUrl) fail(422, 'UNREGISTERED_IMAGE', 'Every image must match an active registered upload.');
}
export async function imageReferenced(t: Tables, session: ClientSession, id: string): Promise<boolean> {
  // Explicit typed-model paths, not string searching serialized documents.
  if (await t.products.findOne({ $or: [{ 'images.cloudinaryPublicId': id }, { 'variants.images.cloudinaryPublicId': id }] }, { session, projection: { _id: 1 } })) return true;
  if (await t.categories.findOne({ 'image.cloudinaryPublicId': id }, { session, projection: { _id: 1 } })) return true;
  if (await t.content.findOne({ $or: [{ 'heroImage.cloudinaryPublicId': id }, { 'artisans.image.cloudinaryPublicId': id }, { 'banners.image.cloudinaryPublicId': id }, { 'gallery.image.cloudinaryPublicId': id }] }, { session, projection: { _id: 1 } })) return true;
  return Boolean(await t.settings.findOne({ 'logo.cloudinaryPublicId': id }, { session, projection: { _id: 1 } }));
}

