import { AlertTriangle, RefreshCw, type LucideIcon } from 'lucide-react';

import { cx } from '@/utils/format';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-6 py-16 text-center animate-fade-in',
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-elevated">
        <Icon className="h-5 w-5 text-faint" strokeWidth={1.6} />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted text-pretty">
        {description}
      </p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

/** Errors are always phrased for a person; raw exceptions never reach here. */
export function ErrorState({
  title = 'Something went wrong.',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center justify-center px-6 py-14 text-center animate-fade-in',
        className,
      )}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-critical/30 bg-critical/10">
        <AlertTriangle className="h-5 w-5 text-critical" strokeWidth={1.7} />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted text-pretty">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-5">
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
          Try again
        </button>
      )}
    </div>
  );
}

export function SkeletonLines({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-10/12', 'w-3/4'];
  return (
    <div className={cx('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className={cx('skeleton h-3', widths[index % widths.length])} />
      ))}
    </div>
  );
}
