import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Category, Product, ImageAsset, SiteContent } from '../src/types';
import { catalogTransaction, tables, closeDatabase } from '../src/lib/db';
import { CONTENT_ID, SETTINGS_ID } from '../src/lib/defaults';
import { productCreateSchema, categoryCreateSchema, contentSchema } from '../src/lib/validation';
import { assertAssets, productAssets, contentAssets } from '../src/lib/references';

async function seed() {
  console.log('--- Initializing Mandakini structured folders & catalog data ---');
  const cwd = process.cwd();
  const demoDir = path.join(cwd, 'public', 'demo-assets');
  const mandakiniDir = path.join(cwd, 'public', 'mandakini');
  const dataDir = path.join(cwd, 'data', 'mandakini');

  // Define category specifications
  const categoryDefs = [
    {
      slug: 'sarees',
      name: 'Sarees',
      description: 'Handcrafted and designer sarees woven with timeless heritage and contemporary grace.',
      demoAsset: 'category-1.webp',
      fileName: 'sarees-collection.webp',
      alt: 'Mandakini Sarees Collection',
      order: 0
    },
    {
      slug: 'suits-kurtis',
      name: 'Suits & Kurtis',
      description: 'Graceful Anarkalis, straight suits, and coordinated kurta sets for everyday luxury and celebrations.',
      demoAsset: 'category-2.webp',
      fileName: 'suits-kurtis-collection.webp',
      alt: 'Mandakini Suits and Kurtis Collection',
      order: 1
    },
    {
      slug: 'lehengas',
      name: 'Lehengas',
      description: 'Artisanal lehengas tailored with intricate embroidery, flared silhouettes, and rich fabrics.',
      demoAsset: 'category-5.webp',
      fileName: 'lehengas-collection.webp',
      alt: 'Mandakini Lehengas Collection',
      order: 2
    },
    {
      slug: 'dupattas-scarves',
      name: 'Dupattas & Scarves',
      description: 'Handwoven Banarasi, Jamdani, and embroidered dupattas to elevate every ensemble.',
      demoAsset: 'category-3.webp',
      fileName: 'dupattas-collection.webp',
      alt: 'Mandakini Dupattas and Scarves',
      order: 3
    },
    {
      slug: 'fabrics',
      name: 'Fabrics & Materials',
      description: 'Pure handloom silks, brocades, and natural heritage textiles sold by the meter.',
      demoAsset: 'fabric.webp',
      fileName: 'fabrics-collection.webp',
      alt: 'Mandakini Pure Heritage Fabrics',
      order: 4
    },
    {
      slug: 'accessories',
      name: 'Artisanal Accessories',
      description: 'Handmade zardozi potlis, clutches, and handcrafted accessories complement your look.',
      demoAsset: 'category-4.webp',
      fileName: 'accessories-collection.webp',
      alt: 'Mandakini Artisanal Accessories',
      order: 5
    }
  ];

  // Define product specifications
  const productDefs = [
    {
      categorySlug: 'sarees',
      name: 'Banarasi Katan Silk Zari Saree',
      slug: 'banarasi-katan-silk-zari-saree',
      sku: 'MND-SAR-001',
      price: 14500,
      discountPrice: 12900,
      fabric: 'Pure Katan Silk with Gold Zari',
      shortDescription: 'Handwoven Banarasi silk saree with floral kadwa motifs and regal gold border.',
      description: 'Woven by master weavers on traditional pit looms, this Banarasi Katan silk saree features intricate floral jaal craftsmanship. Includes matching unstitched blouse piece.',
      sizes: ['Free Size (5.5m + 0.8m Blouse)'],
      colors: ['Vermillion Red', 'Royal Emerald'],
      stock: 6,
      demoAsset: 'product-1.webp',
      fileName: 'banarasi-katan-silk-saree.webp',
      alt: 'Banarasi Katan Silk Zari Saree by Mandakini',
      tags: ['saree', 'banarasi', 'silk', 'wedding', 'festive'],
      featured: true,
      newArrival: true,
      bestseller: true,
      attributes: {
        'Weave': 'Kadwa Handloom',
        'Fabric Origin': 'Varanasi',
        'Care Instructions': 'Dry clean only',
        'Blouse Piece': 'Included (80cm unstitched)'
      }
    },
    {
      categorySlug: 'suits-kurtis',
      name: 'Chanderi Hand-Embroidered Anarkali Set',
      slug: 'chanderi-hand-embroidered-anarkali-set',
      sku: 'MND-SUT-001',
      price: 8900,
      fabric: 'Pure Chanderi Silk & Cotton',
      shortDescription: 'Regal flare Anarkali suit set with zardozi neckline and scalloped organza dupatta.',
      description: 'Crafted from breathable Chanderi silk, this three-piece Anarkali set pairs an embellished kurta with comfortable churidar pants and a sheer organza dupatta.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Ivory Gold', 'Sage Green'],
      stock: 12,
      demoAsset: 'product-2.webp',
      fileName: 'chanderi-embroidered-anarkali.webp',
      alt: 'Chanderi Hand-Embroidered Anarkali Set by Mandakini',
      tags: ['anarkali', 'suit-set', 'chanderi', 'festive'],
      featured: true,
      newArrival: true,
      bestseller: false,
      attributes: {
        'Embroidery': 'Pitta and Zardozi Work',
        'Set Includes': 'Kurta, Churidar, and Dupatta',
        'Fit': 'Flared Kalidar fit',
        'Care Instructions': 'Dry clean only'
      }
    },
    {
      categorySlug: 'lehengas',
      name: 'Handcrafted Heritage Bridal Lehenga',
      slug: 'handcrafted-heritage-bridal-lehenga',
      sku: 'MND-LHG-001',
      price: 38500,
      discountPrice: 35000,
      fabric: 'Raw Silk & Micro Velvet with Dabka Work',
      shortDescription: 'Opulent bridal lehenga with 16 kalis, hand-embroidered floral vines, and double dupatta.',
      description: 'An heirloom bridal masterpiece created over 120 artisan hours. Adorned with dabka, gota patti, and sequins, complemented by a padded blouse and dual dupattas.',
      sizes: ['Semi-Stitched (Up to 42 waist)'],
      colors: ['Crimson Red'],
      stock: 4,
      demoAsset: 'style-3.webp',
      fileName: 'heritage-bridal-lehenga.webp',
      alt: 'Handcrafted Heritage Bridal Lehenga by Mandakini',
      tags: ['lehenga', 'bridal', 'wedding', 'heritage'],
      featured: true,
      newArrival: false,
      bestseller: true,
      attributes: {
        'Craft': 'Dabka and Gota Patti Hand Embroidery',
        'Lehenga Flare': '4.5 meters circular flare',
        'Includes': 'Lehenga Skirt, Blouse Fabric, 2 Dupattas',
        'Care Instructions': 'Dry clean and store in muslin'
      }
    },
    {
      categorySlug: 'dupattas-scarves',
      name: 'Handwoven Jamdani Silk Dupatta',
      slug: 'handwoven-jamdani-silk-dupatta',
      sku: 'MND-DUP-001',
      price: 3200,
      fabric: 'Fine Mulberry Silk',
      shortDescription: 'Featherlight Jamdani weave dupatta featuring geometric floral motifs and tasseled edges.',
      description: 'Woven with supplementary weft technique, this artisanal Jamdani dupatta brings timeless sophistication to plain kurtas or festive dresses.',
      sizes: ['2.5 Meters'],
      colors: ['Midnight Blue with Silver'],
      stock: 8,
      demoAsset: 'product-3.webp',
      fileName: 'jamdani-silk-dupatta.webp',
      alt: 'Handwoven Jamdani Silk Dupatta by Mandakini',
      tags: ['dupatta', 'jamdani', 'handloom', 'silk'],
      featured: false,
      newArrival: true,
      bestseller: false,
      attributes: {
        'Technique': 'Traditional Jamdani Weave',
        'Length': '2.5m x 0.9m',
        'Care Instructions': 'Gentle hand wash or dry clean'
      }
    },
    {
      categorySlug: 'fabrics',
      name: 'Pure Chanderi Brocade Silk Fabric (Per Meter)',
      slug: 'pure-chanderi-brocade-silk-fabric',
      sku: 'MND-FAB-001',
      price: 1250,
      fabric: 'Pure Chanderi Silk with Zari',
      shortDescription: 'Unstitched luxury Chanderi brocade fabric ideal for bespoke kurtas, blouses, or jackets.',
      description: 'Lustrous handloom Chanderi silk fabric woven with delicate gold buttis. Available by the meter for personalized tailoring.',
      sizes: ['Sold per meter (44 inch width)'],
      colors: ['Powder Blue', 'Champagne Gold'],
      stock: 40,
      demoAsset: 'fabric.webp',
      fileName: 'chanderi-brocade-fabric.webp',
      alt: 'Pure Chanderi Brocade Silk Fabric by Mandakini',
      tags: ['fabric', 'chanderi', 'brocade', 'bespoke'],
      featured: false,
      newArrival: false,
      bestseller: true,
      attributes: {
        'Width': '44 inches',
        'Yarn Composition': 'Pure Silk warp & Cotton weft with metallic zari',
        'Care Instructions': 'Dry clean recommended'
      }
    },
    {
      categorySlug: 'accessories',
      name: 'Zardozi Hand-Embroidered Potli Bag',
      slug: 'zardozi-hand-embroidered-potli-bag',
      sku: 'MND-ACC-001',
      price: 1850,
      fabric: 'Velvet & Satin Lining',
      shortDescription: 'Exquisite velvet potli pouch adorned with zardozi embroidery and pearl-beaded drawstrings.',
      description: 'Handcrafted by generational artisans, this traditional potli bag features a roomy interior, secure closure, and elegant pearl tassels.',
      sizes: ['One Size (8 x 9 inches)'],
      colors: ['Maroon Gold', 'Forest Green'],
      stock: 15,
      demoAsset: 'product-4.webp',
      fileName: 'zardozi-embroidered-potli.webp',
      alt: 'Zardozi Hand-Embroidered Potli Bag by Mandakini',
      tags: ['accessory', 'potli', 'zardozi', 'wedding'],
      featured: false,
      newArrival: true,
      bestseller: false,
      attributes: {
        'Closure': 'Drawstring with Pearl Hangings',
        'Lining': 'Smooth poly-satin',
        'Care Instructions': 'Spot clean only'
      }
    }
  ];

  // 1. Create folders
  await mkdir(path.join(mandakiniDir, 'categories'), { recursive: true });
  await mkdir(path.join(mandakiniDir, 'products'), { recursive: true });
  await mkdir(dataDir, { recursive: true });

  const mediaAssets: ImageAsset[] = [];

  // Copy category images and build assets
  const categoryImageMap: Record<string, ImageAsset> = {};
  for (const c of categoryDefs) {
    const catFolder = path.join(mandakiniDir, 'categories', c.slug);
    await mkdir(catFolder, { recursive: true });
    const targetFile = path.join(catFolder, c.fileName);
    const sourceFile = path.join(demoDir, c.demoAsset);
    await copyFile(sourceFile, targetFile);

    const asset: ImageAsset = {
      cloudinaryUrl: `/mandakini/categories/${c.slug}/${c.fileName}`,
      cloudinaryPublicId: `mandakini/categories/${c.slug}/${c.slug}-cover`,
      alt: c.alt
    };
    categoryImageMap[c.slug] = asset;
    mediaAssets.push(asset);
  }

  // Copy product images and build assets
  const productImageMap: Record<string, ImageAsset[]> = {};
  for (const p of productDefs) {
    const prodFolder = path.join(mandakiniDir, 'products', p.categorySlug);
    await mkdir(prodFolder, { recursive: true });
    const targetFile = path.join(prodFolder, p.fileName);
    const sourceFile = path.join(demoDir, p.demoAsset);
    await copyFile(sourceFile, targetFile);

    const primaryAsset: ImageAsset = {
      cloudinaryUrl: `/mandakini/products/${p.categorySlug}/${p.fileName}`,
      cloudinaryPublicId: `mandakini/products/${p.categorySlug}/${p.slug}`,
      alt: p.alt
    };
    mediaAssets.push(primaryAsset);
    productImageMap[p.slug] = [primaryAsset];
  }

  // Also include hero image for homepage
  const heroSource = path.join(demoDir, 'hero.webp');
  const heroTarget = path.join(mandakiniDir, 'hero.webp');
  await copyFile(heroSource, heroTarget);
  const heroAsset: ImageAsset = {
    cloudinaryUrl: '/mandakini/hero.webp',
    cloudinaryPublicId: 'mandakini/home-hero',
    alt: 'Mandakini - Threads of Heritage'
  };
  mediaAssets.push(heroAsset);

  console.log(`Prepared ${mediaAssets.length} image assets in structured public/mandakini folders.`);

  // 2. Prepare Category Documents
  const categories: Category[] = categoryDefs.map(c => {
    const parsed = categoryCreateSchema.parse({
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: categoryImageMap[c.slug],
      order: c.order,
      active: true,
      seoTitle: `${c.name} | Mandakini`,
      seoDescription: c.description
    });
    return { ...parsed, _id: randomUUID(), version: 1 };
  });

  const categoryIdBySlug = Object.fromEntries(categories.map(c => [c.slug, c._id]));

  // 3. Prepare Product Documents
  const now = new Date().toISOString();
  const products: Product[] = productDefs.map(p => {
    const categoryId = categoryIdBySlug[p.categorySlug];
    const images = productImageMap[p.slug];
    const parsed = productCreateSchema.parse({
      name: p.name,
      slug: p.slug,
      description: p.description,
      shortDescription: p.shortDescription,
      price: p.price,
      discountPrice: p.discountPrice,
      sku: p.sku,
      category: categoryId,
      subcategory: '',
      images,
      thumbnail: 0,
      sizes: p.sizes,
      colors: p.colors,
      fabric: p.fabric,
      stock: p.stock,
      status: 'active',
      featured: p.featured,
      newArrival: p.newArrival,
      bestseller: p.bestseller,
      tags: p.tags,
      seoTitle: `${p.name} | Mandakini`,
      seoDescription: p.shortDescription,
      attributes: p.attributes,
      variants: []
    });
    return { ...parsed, _id: randomUUID(), createdAt: now, updatedAt: now, version: 1 };
  });

  // 4. Save metadata / catalog manifest to data/mandakini/catalog.json
  const catalogManifest = {
    businessName: 'MANDAKINI',
    tagline: 'THREADS OF HERITAGE',
    categories: categories.map(c => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imagePath: c.image?.cloudinaryUrl
    })),
    products: products.map(p => ({
      id: p._id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      price: p.price,
      category: categories.find(c => c._id === p.category)?.name,
      fabric: p.fabric,
      stock: p.stock,
      images: p.images.map(img => img.cloudinaryUrl)
    }))
  };
  await writeFile(path.join(dataDir, 'catalog.json'), JSON.stringify(catalogManifest, null, 2), 'utf-8');
  console.log('Saved catalog manifest to data/mandakini/catalog.json.');

  // 5. Database Transaction: insert media, categories, products, skus, content
  await catalogTransaction(async (t, session) => {
    // Upsert media records
    for (const asset of mediaAssets) {
      await t.media.updateOne(
        { cloudinaryPublicId: asset.cloudinaryPublicId },
        {
          $set: {
            cloudinaryUrl: asset.cloudinaryUrl,
            alt: asset.alt,
            kind: 'local',
            state: 'active'
          },
          $setOnInsert: { _id: randomUUID(), createdAt: new Date() }
        },
        { upsert: true, session }
      );
    }

    // Verify assets
    await assertAssets(t, session, [
      heroAsset,
      ...categories.flatMap(c => c.image ? [c.image] : []),
      ...products.flatMap(productAssets)
    ]);

    // Insert or replace categories
    for (const cat of categories) {
      const existing = await t.categories.findOne({ slug: cat.slug }, { session });
      if (existing) {
        await t.categories.updateOne({ _id: existing._id }, { $set: { ...cat, _id: existing._id, version: existing.version + 1 } }, { session });
        // Map back ID so products link correctly
        categoryIdBySlug[cat.slug] = existing._id;
      } else {
        await t.categories.insertOne(cat, { session });
      }
    }

    // Insert products and skus
    for (const prod of products) {
      // Re-point category ID if existing category was updated
      prod.category = categoryIdBySlug[productDefs.find(x => x.slug === prod.slug)!.categorySlug];
      const existing = await t.products.findOne({ slug: prod.slug }, { session });
      if (existing) {
        await t.products.updateOne({ _id: existing._id }, { $set: { ...prod, _id: existing._id, version: existing.version + 1 } }, { session });
        await t.skus.updateOne({ sku: prod.sku }, { $set: { productId: existing._id } }, { upsert: true, session });
      } else {
        await t.products.insertOne(prod, { session });
        await t.skus.insertOne({ _id: randomUUID(), sku: prod.sku, productId: prod._id }, { session });
      }
    }

    // Update homepage content & settings
    const activeCats = await t.categories.find({ active: true }, { session }).toArray();
    const activeProds = await t.products.find({ status: 'active' }, { session }).toArray();
    const currentContent = await t.content.findOne({ _id: CONTENT_ID }, { session });
    const contentVer = currentContent?.version ?? 1;

    await t.content.updateOne(
      { _id: CONTENT_ID },
      {
        $set: {
          heroHeading: 'Woven by\nTradition.\nStyled for Today.',
          heroSubtitle: 'Discover Mandakini’s contemporary heritage and handcrafted elegance.',
          heroImage: heroAsset,
          categoriesHeading: 'Explore our collections',
          productsHeading: 'Curated for you',
          featuredCategories: activeCats.map(c => c._id),
          featuredProducts: activeProds.filter(p => p.featured).map(p => p._id),
          aboutHeading: 'The Mandakini story',
          aboutText: 'Rooted in timeless Indian craft, Mandakini brings you heirloom weaves, master embroidery, and contemporary design.',
          version: contentVer + 1
        }
      },
      { upsert: true, session }
    );

    const currentSettings = await t.settings.findOne({ _id: SETTINGS_ID }, { session });
    const settingsVer = currentSettings?.version ?? 1;

    await t.settings.updateOne(
      { _id: SETTINGS_ID },
      {
        $set: {
          businessName: 'MANDAKINI',
          tagline: 'THREADS OF HERITAGE',
          seoTitle: 'Mandakini',
          seoDescription: 'Handcrafted sarees, suits, lehengas, dupattas and pure fabrics.',
          version: settingsVer + 1
        }
      },
      { upsert: true, session }
    );

    return true;
  });

  console.log('--- Successfully seeded Mandakini categories, products, media assets & settings in MongoDB ---');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exitCode = 1;
}).finally(closeDatabase);
