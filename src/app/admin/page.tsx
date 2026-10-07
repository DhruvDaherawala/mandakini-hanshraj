import Link from 'next/link';
import LoginForm from '@/components/admin/LoginForm';

export const metadata = { title: 'Mandakini Studio', robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <main id="main" className="login-page">
      <section className="login-intro">
        <p className="eyebrow">MANDAKINI STUDIO</p>
        <h1>Your craft.<br/>Your collection.<br/>Your story.</h1>
        <p>A considered space to care for your business.</p>
        <Link href="/">Return to the collection →</Link>
      </section>
      <LoginForm />
    </main>
  );
}
