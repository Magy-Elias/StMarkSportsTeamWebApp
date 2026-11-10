import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card">
      <h1>Page not found.</h1>
      <p>The page you are looking for does not exist.</p>
      <p><Link href="/">Back to home</Link></p>
    </div>
  );
}