'use client';
import { useEffect, useState } from 'react';
import type { Category } from '@/types';
import { api, errorMessage, payload } from '@/lib/api';
import ImageEditor from './ImageEditor';

const blank: Category = {
  _id: '',
  name: '',
  slug: '',
  description: '',
  image: null,
  order: 0,
  active: true,
  seoTitle: '',
  seoDescription: '',
  version: 0
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CategoryManager() {
  const [rows, setRows] = useState<Category[]>([]);
  const [edit, setEdit] = useState<Category | null>(null);
  const [slugManual, setSlugManual] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const reload = () => api<Category[]>('/api/categories?admin=1').then(setRows);

  useEffect(() => {
    reload().catch(e => setError(errorMessage(e)));
  }, []);

  const setField = <K extends keyof Category>(k: K, v: Category[K]) => {
    setEdit(prev => (prev ? { ...prev, [k]: v } : prev));
  };

  const handleNameChange = (val: string) => {
    setEdit(prev => {
      if (!prev) return prev;
      const next: Category = { ...prev, name: val };
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

  const startCreate = () => {
    setEdit({ ...blank, order: rows.length });
    setSlugManual(false);
    setError('');
    setMessage('');
  };

  const startEdit = (c: Category) => {
    setEdit(c);
    setSlugManual(true);
    setError('');
    setMessage('');
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;

    setBusy(true);
    setError('');

    const finalSlug = toSlug(edit.slug || edit.name);
    if (!finalSlug || finalSlug.length < 2) {
      setBusy(false);
      return setError('Please provide a category name or slug with at least 2 characters.');
    }

    const cleaned: Category = {
      ...edit,
      name: edit.name.trim(),
      slug: finalSlug,
      description: edit.description.trim(),
      seoTitle: edit.seoTitle.trim(),
      seoDescription: edit.seoDescription.trim()
    };

    try {
      const saved = await api<Category>(
        cleaned._id ? `/api/categories/${cleaned._id}` : '/api/categories',
        {
          method: cleaned._id ? 'PUT' : 'POST',
          body: payload(cleaned, !cleaned._id)
        }
      );
      setEdit(saved);
      setSlugManual(true);
      await reload();
      setMessage('Category saved successfully.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">STORE COLLECTIONS</p>
          <h1>Categories</h1>
        </div>
        {!edit && (
          <button className="btn" onClick={startCreate}>
            + Add category
          </button>
        )}
      </div>

      {error && <p role="alert" className="notice error">{error}</p>}
      {message && <p role="status" className="notice">{message}</p>}

      {edit ? (
        <form onSubmit={saveCategory}>
          <fieldset disabled={busy}>
            <section className="form-section">
              <h2>{edit._id ? 'Edit Category' : 'Create New Category'}</h2>
              <div className="form-grid">
                <label>
                  Category Name
                  <input
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Sarees, Suits, Lehengas"
                    value={edit.name}
                    onChange={e => handleNameChange(e.target.value)}
                  />
                </label>

                <label>
                  URL Slug
                  <input
                    required
                    placeholder="e.g. sarees, suits-kurtis"
                    value={edit.slug}
                    onChange={e => handleSlugChange(e.target.value)}
                  />
                  <small className="help">Auto-generated from name. Lowercase letters, numbers and hyphens.</small>
                </label>

                <label>
                  Display Order
                  <input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={edit.order}
                    onChange={e => setField('order', Number(e.target.value))}
                  />
                </label>

                <label>
                  SEO Title (optional)
                  <input
                    maxLength={70}
                    placeholder="e.g. Handcrafted Sarees | Mandakini"
                    value={edit.seoTitle}
                    onChange={e => setField('seoTitle', e.target.value)}
                  />
                </label>
              </div>

              <label>
                Description (optional)
                <textarea
                  rows={3}
                  placeholder="Tell customers about this collection..."
                  value={edit.description}
                  onChange={e => setField('description', e.target.value)}
                />
              </label>

              <label>
                SEO Description (optional)
                <textarea
                  maxLength={170}
                  value={edit.seoDescription}
                  onChange={e => setField('seoDescription', e.target.value)}
                />
              </label>

              <div className="checks">
                <label>
                  <input
                    type="checkbox"
                    checked={edit.active}
                    onChange={e => setField('active', e.target.checked)}
                  />
                  Visible on website
                </label>
              </div>

              <div>
                <h3>Collection Cover Image (optional)</h3>
                <ImageEditor
                  single
                  images={edit.image ? [edit.image] : []}
                  onChange={x => setField('image', x[0] || null)}
                />
              </div>
            </section>

            <div className="row" style={{ marginTop: '1.5rem', gap: '1rem' }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Saving…' : 'Save category'}
              </button>
              <button type="button" onClick={() => setEdit(null)}>
                Back to list
              </button>
            </div>
          </fieldset>
        </form>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Slug</th>
                <th>Order</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => a.order - b.order)
                .map(c => (
                  <tr key={c._id}>
                    <td>
                      <strong>{c.name}</strong>
                    </td>
                    <td><code>{c.slug}</code></td>
                    <td>{c.order}</td>
                    <td>{c.active ? 'Visible' : 'Hidden'}</td>
                    <td>
                      <div className="row">
                        <button onClick={() => startEdit(c)}>Edit</button>
                        <button
                          disabled={busy}
                          onClick={async () => {
                            if (!window.confirm(`Remove “${c.name}”? Categories containing products cannot be deleted.`)) return;
                            setBusy(true);
                            setError('');
                            try {
                              await api(`/api/categories/${c._id}`, {
                                method: 'DELETE',
                                body: JSON.stringify({ version: c.version })
                              });
                              await reload();
                              setMessage('Category removed.');
                            } catch (e) {
                              setError(errorMessage(e));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5}>No categories yet. Click “+ Add category” above to create your first collection.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
