import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="card stack">
      <h1>Welcome</h1>
      <p>
        Use the recorder to capture your recitation, upload it to the BFF, and request a scoring job
        without leaving the browser.
      </p>
      <Link className="primary" href="/record">
        Go to recorder
      </Link>
    </div>
  );
}
