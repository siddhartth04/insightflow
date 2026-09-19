import { cx } from '@/utils/format';

export type StatusKind = 'online' | 'offline' | 'checking' | 'warning';

const TONE: Record<StatusKind, { dot: string; text: string; label: string }> = {
  online: { dot: 'bg-positive', text: 'text-positive', label: 'Operational' },
  offline: { dot: 'bg-critical', text: 'text-critical', label: 'Offline' },
  checking: { dot: 'bg-faint', text: 'text-faint', label: 'Checking' },
  warning: { dot: 'bg-caution', text: 'text-caution', label: 'Degraded' },
};

interface StatusDotProps {
  status: StatusKind;
  label?: string;
  className?: string;
  /** Hide the text and render only the indicator. */
  bare?: boolean;
}

export function StatusDot({ status, label, className, bare = false }: StatusDotProps) {
  const tone = TONE[status];
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {status === 'online' && (
          <span
            className={cx('absolute inline-flex h-full w-full rounded-full animate-pulse-ring', tone.dot)}
          />
        )}
        <span className={cx('relative inline-flex h-1.5 w-1.5 rounded-full', tone.dot)} />
      </span>
      {!bare && (
        <span className={cx('text-xs font-medium', tone.text)}>{label ?? tone.label}</span>
      )}
    </span>
  );
}
