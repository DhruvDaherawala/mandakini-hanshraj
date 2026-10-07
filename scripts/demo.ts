import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import type { ClientSession } from 'mongodb';
import type { Category, Product, ImageAsset, SiteContent } from '../src/types';
import { catalogTransaction, closeDatabase, type Tables } from '../src/lib/db';
import { defaultContent, defaultSettings, CONTENT_ID, SETTINGS_ID } from '../src/lib/defaults';
import { productCreateSchema, categoryCreateSchema, contentSchema } from '../src/lib/validation';
import { uploadImage, deleteImage, normalizeImage } from '../src/lib/media';
import { UPLOAD_LIMIT } from '../src/lib/config';
import { assertAssets, productAssets, contentAssets } from '../src/lib/references';

async function empty(t: Tables, session: ClientSession, allowedMedia: string[] = []) {
  if (await t.products.countDocuments({}, { session }) || await t.categories.countDocuments({}, { session }) || await t.skus.countDocuments({}, { session }) || await t.media.countDocuments({ cloudinaryPublicId: { $nin: allowedMedia } }, { session })) throw new Error('Refusing to seed a nonempty catalog.');
  const c = await t.content.findOne({ _id: CONTENT_ID }, { session }), s = await t.settings.findOne({ _id: SETTINGS_ID }, { session });
  if (!c || !s) throw new Error('Run database setup first.');
  const { _id: ci, ...cv } = c, { _id: si, ...sv } = s;
  if (!isDeepStrictEqual(cv, defaultContent) || !isDeepStrictEqual(sv, defaultSettings)) throw new Error('Refusing to replace modified content or settings.');
}
async function main() {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEMO_SEED !== 'true' || !args.includes('--confirm-empty')) throw new Error('Demo seed requires NODE_ENV=development, ALLOW_DEMO_SEED=true and --confirm-empty. Never run it against production.');
  if (args.some(a => a !== '--confirm-empty' && a !== '--upload' && !a.startsWith('--assets='))) throw new Error('Supported flags: --confirm-empty, --upload, --assets=directory');
  const directory = path.resolve(args.find(a => a.startsWith('--assets='))?.slice(9) || 'public/demo-assets');
  const remote = args.includes('--upload');
  await catalogTransaction(async (t, session) => { await empty(t, session); return true; });
  const names = ['hero', ...Array.from({ length: 6 }, (_, i) => `category-${i + 1}`), ...Array.from({ length: 5 }, (_, i) => `product-${i + 1}`), ...Array.from({ length: 3 }, (_, i) => `artisan-${i + 1}`), ...Array.from({ length: 4 }, (_, i) => `style-${i + 1}`), 'fabric'];
  const assets: Record<string, ImageAsset> = {}, uploaded: ImageAsset[] = []; let committed = false;
  try {
    for (const name of names) {
      const filename = path.join(directory, `${name}.webp`), info = await stat(filename);
      if (!info.isFile() || info.size > UPLOAD_LIMIT) throw new Error(`Invalid demo asset: ${name}.webp`);
      const bytes = await readFile(filename), alt = `Riwayat demonstration image: ${name.replaceAll('-', ' ')}`;
      if (remote) { assets[name] = await uploadImage(bytes, 'image/webp', alt); uploaded.push(assets[name]); }
      else { await normalizeImage(bytes, 'image/webp'); assets[name] = { cloudinaryUrl: `/demo-assets/${name}.webp`, cloudinaryPublicId: `demo/${name}`, alt }; }
    }
    const categoryNames = ['Embroidered Sets', 'Heritage Dresses', 'Scarves', 'Artisan Accessories', 'Occasion Wear', 'Handcrafted Pieces'];
    const categories: Category[] = categoryNames.map((name, i) => ({ ...categoryCreateSchema.parse({ name, slug: name.toLowerCase().replaceAll(' ', '-'), description: 'Illustrative demo collection. Replace before launch.', image: assets[`category-${i + 1}`], order: i, active: true }), _id: randomUUID(), version: 1 }));
    const productNames = ['Floral Embroidered Lawn Suit', 'Heritage Block Print Anarkali', 'Handwoven Jamdani Dupatta', 'Zardozi Potli Bag', 'Embroidered Organza Kameez'];
    const now = new Date().toISOString();
    const products: Product[] = productNames.map((name, i) => {
      const quantities = i === 3 ? [0, 0, 0] : i === 1 ? [1, 1, 1] : [6, 4, 2];
      const sizes = i === 1 ? ['S', 'M', 'L'] : ['One size'];
      const variants = i === 1 ? sizes.map((size, j) => ({ id: randomUUID(), size, color: 'Natural', sku: `DEMO-${i + 1}-${size}`, stock: quantities[j], images: [] })) : [];
      const p = productCreateSchema.parse({ name, slug: name.toLowerCase().replaceAll(' ', '-'), description: 'Demonstration catalog item. Verify and replace product details, prices and stock before launch.', shortDescription: 'Illustrative Riwayat catalog item.', price: [4200, 2400, 1800, 3600, 900][i], sku: `DEMO-${i + 1}`, category: categories[i]._id, images: [assets[`product-${i + 1}`], assets.fabric], thumbnail: 0, sizes, colors: ['Natural'], fabric: 'Demo textile — verify composition', stock: quantities.reduce((a, b) => a + b, 0), variants, status: 'active', featured: i < 3, newArrival: i < 2, tags: ['demo'] });
      return { ...p, _id: randomUUID(), createdAt: now, updatedAt: now, version: 1 };
    });
    const content: SiteContent = contentSchema.parse({ ...defaultContent, heroImage: assets.hero, heroSubtitle: 'A demonstration of the Riwayat collection. Replace this content before launch.', featuredCategories: categories.map(c => c._id), featuredProducts: products.map(p => p._id), aboutText: 'Demonstration content and fictional artisan profiles. Replace with verified business information before publishing.',
      artisans: ['Amina', 'Rafiq', 'Saira'].map((name, i) => ({ name, role: 'Illustrative artisan profile', location: 'Demo', image: assets[`artisan-${i + 1}`] })),
      banners: [{title:'New Collection',text:'Summer heritage. Light fabrics, timeless craft. Demonstration content.',ctaLabel:'Explore the collection',href:'/shop',image:assets['style-3']},{title:'Fabric Focus',text:'Discover the texture and detail behind each piece. Demonstration content.',ctaLabel:'Explore fabrics',href:'/shop',image:assets.fabric}],
      gallery: Array.from({ length: 4 }, (_, i) => ({ title: ['Everyday Elegance','Festive Favourites','Wedding Guest Looks','Layer with Scarves'][i], href: '/shop', image: assets[`style-${i + 1}`] })) });
    await catalogTransaction(async (t, session) => {
      await empty(t, session, uploaded.map(a => a.cloudinaryPublicId));
      if (!remote) await t.media.insertMany(Object.values(assets).map(a => ({ _id: randomUUID(), ...a, kind: 'local' as const, state: 'active' as const, createdAt: new Date() })), { session });
      // Validate remote uploads again under the final write guard, including deletion-state races.
      await assertAssets(t, session, [...categories.flatMap(c => c.image ? [c.image] : []), ...products.flatMap(productAssets), ...contentAssets(content)]);
      await t.categories.insertMany(categories, { session });
      await t.products.insertMany(products, { session });
      await t.skus.insertMany(products.flatMap(p => [p.sku, ...p.variants.map(v => v.sku)].map(sku => ({ _id: randomUUID(), sku, productId: p._id }))), { session });
      await t.content.replaceOne({ _id: CONTENT_ID, version: 1 }, { ...content, version: 2 }, { session });
      await t.settings.replaceOne({ _id: SETTINGS_ID, version: 1 }, { ...defaultSettings, footerText: 'Demonstration storefront. Replace all demo information before launch.', version: 2 }, { session });
      return true;
    });
    committed = true;
    console.log('Created six categories, five demo products and demonstration content. No orders, payment provider or customer records were created.');
  } finally {
    if (!committed) for (const asset of uploaded) {
      try { await deleteImage(asset.cloudinaryPublicId); } catch { console.error(`Cleanup pending for registry image ${asset.cloudinaryPublicId}; retry authenticated image deletion.`); }
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Demo seed failed.'); process.exitCode = 1; }).finally(closeDatabase);

