import { Link } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';

import { StatusDot, type StatusKind } from '@/components/StatusDot';
import { cx } from '@/utils/format';

interface ModuleCardProps {
  title: string;
  description: string;
  agents: string[];
  to: string;
  cta: string;
  icon: LucideIcon;
  status: StatusKind;
  statusLabel?: string;
}

export function ModuleCard({
  title,
  description,
  agents,
  to,
  cta,
  icon: Icon,
  status,
  statusLabel,
}: ModuleCardProps) {
  return (
    <Link
      to={to}
      className="card-interactive group relative flex flex-col overflow-hidden p-6 focus-visible:ring-2"
    >
      {/* Faint texture anchored to the corner, not a full gradient wash. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/[0.055] blur-2xl transition-opacity duration-500 group-hover:bg-accent/[0.09]"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline bg-elevated text-accent transition-colors duration-300 group-hover:border-accent/35">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </div>
        <StatusDot status={status} label={statusLabel} />
      </div>

      <h3 className="relative mt-5 text-base font-semibold tracking-tight text-ink">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted text-pretty">{description}</p>

      {/* The agent pipeline, shown as a compact chain. */}
      <div className="relative mt-5 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {agents.map((agent, index) => (
          <span key={agent} className="flex items-center gap-1.5">
            <span className="rounded-md border border-hairline bg-elevated px-2 py-1 text-2xs font-medium text-muted transition-colors duration-300 group-hover:border-hairlineStrong">
              {agent}
            </span>
            {index < agents.length - 1 && (
              <span aria-hidden className="text-faint">
                →
              </span>
            )}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex items-center gap-1.5 border-t border-hairline pt-4 text-sm font-medium text-ink">
        <span>{cta}</span>
        <ArrowRight
          className={cx(
            'h-4 w-4 text-accent transition-transform duration-300 ease-subtle',
            'group-hover:translate-x-1',
          )}
          strokeWidth={1.8}
        />
      </div>
    </Link>
  );
}
