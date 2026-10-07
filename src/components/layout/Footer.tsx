import Link from 'next/link';
import type { SiteSettings } from '@/types';

export default function Footer({ settings: s }: { settings: SiteSettings }) {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <h2 className="wordmark-name">{s.businessName}</h2>
          <p>{s.footerText}</p>
        </div>
        <div>
          <h3>SHOP</h3>
          <Link href="/shop">All collections</Link>
          <Link href="/categories">Categories</Link>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/bag">Enquiry bag</Link>
        </div>
        <div>
          <h3>ABOUT</h3>
          <Link href="/about">Our story</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/admin">{s.businessName} Studio</Link>
        </div>
        <div>
          <h3>STAY CONNECTED</h3>
          <p>{s.businessHours}</p>
          {s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}
          {s.instagram && (
            <a target="_blank" rel="noopener noreferrer" href={s.instagram}>
              Instagram ↗
            </a>
          )}
          {s.facebook && (
            <a target="_blank" rel="noopener noreferrer" href={s.facebook}>
              Facebook ↗
            </a>
          )}
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} {s.businessName}. {s.tagline}
      </div>
    </footer>
  );
}
