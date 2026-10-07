'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, errorMessage } from '@/lib/api';

export default function AdminShell({
  email,
  businessName = 'MANDAKINI',
  children
}: {
  email: string;
  businessName?: string;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className={`admin-shell ${open ? 'open' : ''}`}>
      <aside className="admin-sidebar">
        <Link href="/admin/dashboard" className="wordmark">
          <span>✥</span>
          <strong>{businessName}</strong>
          <small>{businessName} STUDIO</small>
        </Link>
        <button className="mobile-only" onClick={() => setOpen(false)}>
          Close menu
        </button>
        <nav>
          {[
            ['dashboard', 'Overview'],
            ['products', 'Products'],
            ['categories', 'Categories'],
            ['content', 'Homepage'],
            ['settings', 'Settings']
          ].map(([p, l]) => (
            <Link
              onClick={() => setOpen(false)}
              className={path.includes('/' + p) ? 'active' : ''}
              href={'/admin/' + p}
              key={p}
            >
              {l}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/">View storefront ↗</Link>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                await api('/api/auth/logout', { method: 'POST' });
                router.replace('/admin');
                router.refresh();
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button className="mobile-only" onClick={() => setOpen(true)} aria-expanded={open}>
            ☰ Menu
          </button>
          <span>{businessName} STUDIO</span>
          <small>{email}</small>
        </header>
        <main id="main" className="admin-body">
          {children}
        </main>
      </div>
    </div>
  );
}
