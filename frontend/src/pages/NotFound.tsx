import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-rise">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-hairline bg-elevated">
        <Compass className="h-5 w-5 text-faint" strokeWidth={1.6} />
      </div>
      <p className="font-mono text-2xs uppercase tracking-[0.15em] text-faint">Error 404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-ink">Page not found.</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
        That page does not exist in this workspace.
      </p>
      <Link to="/" className="btn-secondary mt-6">
        Back to Overview
      </Link>
    </div>
  );
}
