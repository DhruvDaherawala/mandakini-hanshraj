'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import type { Product, Category, Variant } from '@/types';
import { api, payload, errorMessage } from '@/lib/api';
import { stockOf } from '@/lib/frontend';
import ImageEditor from './ImageEditor';

const blank: Product = {
  _id: '',
  name: '',
  slug: '',
  description: '',
  shortDescription: '',
  price: 0,
  sku: '',
  category: '',
  subcategory: '',
  images: [],
  thumbnail: 0,
  sizes: [],
  colors: [],
  fabric: '',
  stock: 0,
  status: 'draft',
  featured: false,
  newArrival: false,
  bestseller: false,
  tags: [],
  seoTitle: '',
  seoDescription: '',
  attributes: {},
  variants: [],
  createdAt: '',
  updatedAt: '',
  version: 0
};

const clientSchema = z.object({
  name: z.string().trim().min(2, 'Enter a product name.'),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase hyphenated slug.'),
  sku: z.string().min(1, 'Enter a SKU.'),
  category: z.string().min(1, 'Choose a category.'),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  discountPrice: z.number().min(0).optional()
}).refine(x => x.discountPrice === undefined || x.discountPrice <= x.price, {
  message: 'Discounted price cannot exceed regular price.'
});

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ProductForm({ id }: { id?: string }) {
  const [p, setP] = useState<Product>(blank);
  const [cats, setCats] = useState<Category[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [slugManual, setSlugManual] = useState(false);

  // Quick category creation state
  const [showQuickCat, setShowQuickCat] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatBusy, setQuickCatBusy] = useState(false);

  const loadData = () => {
    return Promise.all([
      api<Category[]>('/api/categories?admin=1'),
      id ? api<Product>(`/api/products/${id}?admin=1`) : Promise.resolve({ ...blank })
    ]);
  };

  useEffect(() => {
    let active = true;
    loadData()
      .then(([c, v]) => {
        if (active) {
          setCats(c);
          setP(v);
          if (v.slug) setSlugManual(true);
        }
      })
      .catch(e => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => { active = false; };
  }, [id]);

  const setField = <K extends keyof Product>(k: K, v: Product[K]) => {
    setP(prev => ({ ...prev, [k]: v }));
  };

  const handleNameChange = (val: string) => {
    setP(prev => {
      const next = { ...prev, name: val };
      if (!slugManual || !prev.slug) {
        next.slug = toSlug(val);
      }
      return next;
    });
  };

  const handleSlugChange = (val: string) => {
    setSlugManual(true);
    setField('slug', toSlug(val));
  };

  const handleQuickCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = quickCatName.trim();
    if (!name) return;
    const slug = toSlug(name);
    if (!slug) return setError('Invalid category name.');

    setQuickCatBusy(true);
    setError('');
    try {
      const newCat = await api<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          description: '',
          image: null,
          order: cats.length,
          active: true,
          seoTitle: '',
          seoDescription: ''
        })
      });
      const updatedCats = await api<Category[]>('/api/categories?admin=1');
      setCats(updatedCats);
      setField('category', newCat._id);
      setQuickCatName('');
      setShowQuickCat(false);
      setMessage(`Category “${newCat.name}” created and selected.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setQuickCatBusy(false);
    }
  };

  const variant = (i: number, k: keyof Variant, value: Variant[keyof Variant]) => {
    setField('variants', p.variants.map((v, n) => (n === i ? { ...v, [k]: value } : v)));
  };

  const list = (k: 'sizes' | 'colors' | 'tags', label: string) => (
    <label>
      {label}
      <input
        value={p[k].join(',')}
        onChange={e => setField(k, e.target.value.split(','))}
      />
      <small>Separate values with commas.</small>
    </label>
  );

  if (busy) return <p>Loading product…</p>;

  return (
    <form
      onSubmit={async e => {
        e.preventDefault();
        setError('');
        setMessage('');

        const next = {
          ...p,
          slug: toSlug(p.slug || p.name),
          sku: p.sku.trim().toUpperCase(),
          sizes: p.variants.length
            ? [...new Set(p.variants.map(v => v.size.trim()).filter(Boolean))]
            : p.sizes.map(x => x.trim()).filter(Boolean),
          colors: p.variants.length
            ? [...new Set(p.variants.map(v => v.color.trim()).filter(Boolean))]
            : p.colors.map(x => x.trim()).filter(Boolean),
          tags: p.tags.map(x => x.trim()).filter(Boolean),
          stock: stockOf(p)
        };

        const check = clientSchema.safeParse(next);
        if (!check.success) return setError(check.error.issues.map(x => x.message).join(' '));
        if (p.variants.some(v => !Number.isInteger(v.stock) || v.stock < 0)) {
          return setError('Variation stock must be a nonnegative whole number.');
        }

        setSaving(true);
        try {
          const saved = await api<Product>(
            p._id ? `/api/products/${p._id}` : '/api/products',
            {
              method: p._id ? 'PUT' : 'POST',
              body: payload(next, !p._id)
            }
          );
          setP(saved);
          setMessage('Product saved successfully. Removed photos can now be deleted if unused.');
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">CATALOG</p>
          <h1>{p._id ? 'Edit Product' : 'Add Product'}</h1>
        </div>
        <Link href="/admin/products">Back to products</Link>
      </div>

      {error && <p className="notice error" role="alert">{error}</p>}
      {message && <p className="notice" role="status">{message}</p>}

      <fieldset disabled={saving}>
        <section className="form-section">
          <h2>Basic information</h2>
          <div className="form-grid">
            <label>
              Product name
              <input
                required
                maxLength={160}
                placeholder="e.g. Banarasi Katan Silk Saree"
                value={p.name}
                onChange={e => handleNameChange(e.target.value)}
              />
            </label>
            <label>
              Slug
              <input
                required
                placeholder="e.g. banarasi-katan-silk-saree"
                value={p.slug}
                onChange={e => handleSlugChange(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  setSlugManual(false);
                  setField('slug', toSlug(p.name));
                }}
              >
                Auto-generate from name
              </button>
            </label>
          </div>
          <label>
            Short description
            <textarea
              maxLength={500}
              placeholder="Brief summary for listings..."
              value={p.shortDescription}
              onChange={e => setField('shortDescription', e.target.value)}
            />
          </label>
          <label>
            Detailed description
            <textarea
              rows={6}
              maxLength={10000}
              placeholder="Full description of craftsmanship, weaving technique, styling..."
              value={p.description}
              onChange={e => setField('description', e.target.value)}
            />
          </label>
        </section>

        <section className="form-section">
          <h2>Pricing & stock</h2>
          <div className="form-grid">
            <label>
              Regular price (INR)
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={p.price}
                onChange={e => setField('price', Number(e.target.value))}
              />
            </label>
            <label>
              Discounted price (optional)
              <input
                type="number"
                min={0}
                max={p.price}
                step="0.01"
                value={p.discountPrice ?? ''}
                onChange={e => setField('discountPrice', e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </label>
            <label>
              SKU / product code
              <input
                required
                placeholder="e.g. MND-SAR-001"
                value={p.sku}
                onChange={e => setField('sku', e.target.value.toUpperCase())}
              />
            </label>
            <label>
              {p.variants.length ? 'Total stock from variations' : 'Stock quantity'}
              <input
                type="number"
                required
                min={0}
                step={1}
                disabled={!!p.variants.length}
                value={stockOf(p)}
                onChange={e => setField('stock', Number(e.target.value))}
              />
            </label>
            {list('sizes', 'Available sizes')}
            {list('colors', 'Available colours')}
          </div>

          <h3>Size & colour variations</h3>
          <p className="help">Optional. Each variation has its own stock. Leave its price blank to use the product price.</p>
          {p.variants.map((v, i) => (
            <div className="variant" key={v.id}>
              <div className="form-grid">
                {(['size', 'color', 'sku'] as const).map(k => (
                  <label key={k}>
                    {k === 'color' ? 'Colour' : k === 'sku' ? 'Variation SKU (optional)' : 'Size'}
                    <input
                      value={v[k]}
                      onChange={e => variant(i, k, e.target.value)}
                    />
                  </label>
                ))}
                <label>
                  Price override
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={v.price ?? ''}
                    onChange={e => variant(i, 'price', e.target.value === '' ? undefined : Number(e.target.value))}
                  />
                </label>
                <label>
                  Stock
                  <input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={v.stock}
                    onChange={e => variant(i, 'stock', Number(e.target.value))}
                  />
                </label>
              </div>
              <ImageEditor max={8} images={v.images} onChange={x => variant(i, 'images', x)} />
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (window.confirm('Remove this variation? Save changes to apply.')) {
                    setField('variants', p.variants.filter((_, n) => n !== i));
                  }
                }}
              >
                Remove variation
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn outline"
            onClick={() => setField('variants', [...p.variants, { id: crypto.randomUUID(), size: '', color: '', sku: '', stock: 0, images: [] }])}
          >
            Add variation
          </button>
        </section>

        <section className="form-section">
          <h2>Organisation</h2>
          <div className="form-grid">
            <div>
              <label>
                Category
                <select
                  required
                  value={p.category}
                  onChange={e => setField('category', e.target.value)}
                >
                  <option value="">Choose a category</option>
                  {cats.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}{c.active ? '' : ' (hidden)'}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  style={{ fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}
                  onClick={() => setShowQuickCat(!showQuickCat)}
                >
                  {showQuickCat ? '✕ Cancel' : '+ Quick add category'}
                </button>
                <Link
                  href="/admin/categories"
                  target="_blank"
                  style={{ fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  Manage all categories ↗
                </Link>
              </div>

              {showQuickCat && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--color-surface, #f9f9f9)', borderRadius: '4px', border: '1px solid #ccc' }}>
                  <label style={{ fontSize: '0.85rem' }}>
                    New Category Name:
                    <input
                      type="text"
                      placeholder="e.g. Festive Kurta Sets"
                      value={quickCatName}
                      onChange={e => setQuickCatName(e.target.value)}
                      disabled={quickCatBusy}
                      style={{ marginTop: '0.25rem', marginBottom: '0.5rem', width: '100%' }}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={quickCatBusy || !quickCatName.trim()}
                      onClick={handleQuickCatSubmit}
                      style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
                    >
                      {quickCatBusy ? 'Creating…' : 'Create & Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQuickCat(false)}
                      style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label>
              Subcategory
              <input
                value={p.subcategory}
                placeholder="e.g. Traditional, Festive, Bridal"
                onChange={e => setField('subcategory', e.target.value)}
              />
            </label>
            <label>
              Fabric / material
              <input
                value={p.fabric}
                placeholder="e.g. Pure Katan Silk, Chanderi"
                onChange={e => setField('fabric', e.target.value)}
              />
            </label>
            {list('tags', 'Tags')}
          </div>

          <h3>Additional details</h3>
          {Object.entries(p.attributes).map(([k, v]) => (
            <div className="row" key={k}>
              <label>
                {k}
                <input
                  value={v}
                  onChange={e => setField('attributes', { ...p.attributes, [k]: e.target.value })}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const x = { ...p.attributes };
                  delete x[k];
                  setField('attributes', x);
                }}
              >
                Remove detail
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const key = window.prompt('Detail name, for example Care instructions');
              if (key?.trim() && !['__proto__', 'constructor', 'prototype'].includes(key.trim())) {
                setField('attributes', { ...p.attributes, [key.trim()]: '' });
              }
            }}
          >
            Add detail
          </button>
        </section>

        <section className="form-section">
          <h2>Photos</h2>
          <ImageEditor
            images={p.images}
            thumbnail={p.thumbnail}
            onThumbnail={n => setField('thumbnail', n)}
            onChange={x => setField('images', x)}
          />
        </section>

        <section className="form-section">
          <h2>Visibility</h2>
          <label>
            Product status
            <select
              value={p.status}
              onChange={e => setField('status', e.target.value as Product['status'])}
            >
              <option value="draft">Draft — not visible</option>
              <option value="active">Published</option>
            </select>
          </label>
          <div className="checks">
            {(['featured', 'newArrival', 'bestseller'] as const).map(k => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={p[k]}
                  onChange={e => setField(k, e.target.checked)}
                />
                {k === 'featured' ? 'Featured' : k === 'newArrival' ? 'New arrival' : 'Bestseller'}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Search engine information</h2>
          <label>
            SEO title
            <input
              maxLength={70}
              value={p.seoTitle}
              onChange={e => setField('seoTitle', e.target.value)}
            />
          </label>
          <label>
            SEO description
            <textarea
              maxLength={170}
              value={p.seoDescription}
              onChange={e => setField('seoDescription', e.target.value)}
            />
          </label>
        </section>

        <button className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </fieldset>
    </form>
  );
}
