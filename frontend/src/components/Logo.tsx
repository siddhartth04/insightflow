import { cx } from '@/utils/format';

interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * The InsightFlow mark: a four-point star built from converging strokes,
 * suggesting separate inputs resolving into a single insight. Pure SVG, so it
 * stays crisp from favicon to header size.
 */
export function LogoMark({ size = 28, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="InsightFlow"
      className={className}
    >
      <rect width="32" height="32" rx="8" className="fill-elevated" />
      <rect width="32" height="32" rx="8" className="stroke-hairlineStrong" strokeWidth="1" />
      <path
        d="M16 6.5c.55 4.04 2.66 6.63 6.9 7.5-4.24.87-6.35 3.46-6.9 7.5-.55-4.04-2.66-6.63-6.9-7.5 4.24-.87 6.35-3.46 6.9-7.5Z"
        className="fill-accent"
      />
      <path
        d="M10.5 22.5h11"
        className="stroke-accent"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M13 25.75h6"
        className="stroke-accent"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.28"
      />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
  size?: number;
  showTagline?: boolean;
}

export function Wordmark({ className, size = 28, showTagline = false }: WordmarkProps) {
  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <div className="min-w-0 leading-none">
        <div className="truncate text-[0.95rem] font-semibold tracking-tight text-ink">
          InsightFlow
        </div>
        {showTagline && (
          <div className="mt-1 truncate text-2xs font-medium tracking-wide text-faint">
            Research. Analyze. Create.
          </div>
        )}
      </div>
    </div>
  );
}
