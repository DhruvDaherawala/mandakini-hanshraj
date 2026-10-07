'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { api, errorMessage } from '@/lib/api';
import { stockOf } from '@/lib/frontend';

type Summary = {
  total: number;
  active: number;
  outOfStock: number;
  lowStock: number;
  categories: number;
  featured: number;
  recent: Product[];
};

export default function Dashboard() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setError('');
    api<Summary>('/api/admin/dashboard')
      .then(setData)
      .catch(e => setError(errorMessage(e)));
  }, [retry]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR BUSINESS, AT A GLANCE</p>
          <h1>Welcome to Mandakini Studio.</h1>
        </div>
        <Link className="btn" href="/admin/products/new">
          + Add product
        </Link>
      </div>

      {error && (
        <p role="alert" className="notice error">
          {error} <button onClick={() => setRetry(retry + 1)}>Retry</button>
        </p>
      )}

      {!data && !error && <p role="status">Loading overview…</p>}

      {data && (
        <>
          <div className="stats">
            {(
              [
                ['total', 'Total products'],
                ['active', 'Published products'],
                ['outOfStock', 'Out of stock'],
                ['lowStock', 'Low stock'],
                ['categories', 'Categories'],
                ['featured', 'Featured products']
              ] as const
            ).map(([k, l]) => (
              <div className="stat" key={k}>
                <span>{l}</span>
                <strong>{data[k]}</strong>
              </div>
            ))}
          </div>

          {data.lowStock + data.outOfStock > 0 && (
            <p className="notice">
              Some pieces need an inventory update.{' '}
              <Link href="/admin/products">Review your stock →</Link>
            </p>
          )}

          <h2>Recently added</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Visibility</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map(p => (
                  <tr key={p._id}>
                    <td>
                      <Link href={`/admin/products/${p._id}`}>{p.name}</Link>
                    </td>
                    <td>{p.status}</td>
                    <td>{stockOf(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
