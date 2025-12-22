import { RecorderClient } from './RecorderClient';

export default function RecordPage() {
  return (
    <div className="stack">
      <div className="card stack">
        <h1>Recording test page</h1>
        <p>
          Capture a short recitation, upload it via the BFF signed URL endpoint, and queue a scoring
          job that will be polled from the browser.
        </p>
        <ul>
          <li>Server Actions request the signed upload URL and scoring job endpoints.</li>
          <li>The browser PUTs the audio blob to the signed URL.</li>
          <li>A follow-up poll keeps refreshing the job result.</li>
        </ul>
      </div>
      <RecorderClient />
    </div>
  );
}
