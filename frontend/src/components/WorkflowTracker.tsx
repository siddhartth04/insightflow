import { Check, X, type LucideIcon } from 'lucide-react';

import type { AgentPhase } from '@/types';
import { cx } from '@/utils/format';

export interface TrackerStep {
  id: string;
  name: string;
  role: string;
  icon: LucideIcon;
}

interface WorkflowTrackerProps {
  steps: TrackerStep[];
  phases: AgentPhase[];
  className?: string;
}

const PHASE_LABEL: Record<AgentPhase, string> = {
  pending: 'Waiting',
  active: 'Working',
  done: 'Complete',
  failed: 'Failed',
};

/** Vertical agent pipeline with per-stage status. */
export function WorkflowTracker({ steps, phases, className }: WorkflowTrackerProps) {
  return (
    <ol className={cx('space-y-0', className)}>
      {steps.map((step, index) => {
        const phase = phases[index] ?? 'pending';
        const isLast = index === steps.length - 1;
        const Icon = step.icon;

        return (
          <li key={step.id} className="relative flex gap-3.5">
            {/* Connector between stages */}
            {!isLast && (
              <span
                aria-hidden
                className={cx(
                  'absolute left-[15px] top-[34px] h-[calc(100%-26px)] w-px transition-colors duration-500',
                  phase === 'done' ? 'bg-accent/45' : 'bg-hairline',
                )}
              />
            )}

            <span
              className={cx(
                'relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ease-subtle',
                phase === 'done' && 'border-accent/40 bg-accent/12 text-accent',
                phase === 'active' && 'border-accent/60 bg-accent/15 text-accent',
                phase === 'failed' && 'border-critical/40 bg-critical/12 text-critical',
                phase === 'pending' && 'border-hairline bg-elevated text-faint',
              )}
            >
              {phase === 'done' ? (
                <Check className="h-4 w-4" strokeWidth={2.2} />
              ) : phase === 'failed' ? (
                <X className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <Icon className="h-4 w-4" strokeWidth={1.7} />
              )}
              {phase === 'active' && (
                <span className="absolute inset-0 rounded-lg border border-accent/50 animate-pulse-ring" />
              )}
            </span>

            <div className={cx('min-w-0 flex-1', !isLast && 'pb-5')}>
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cx(
                    'truncate text-sm font-medium transition-colors duration-300',
                    phase === 'pending' ? 'text-muted' : 'text-ink',
                  )}
                >
                  {step.name}
                </p>
                <span
                  className={cx(
                    'shrink-0 text-2xs font-medium uppercase tracking-wider transition-colors duration-300',
                    phase === 'done' && 'text-positive',
                    phase === 'active' && 'text-accent',
                    phase === 'failed' && 'text-critical',
                    phase === 'pending' && 'text-faint',
                  )}
                >
                  {PHASE_LABEL[phase]}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-faint">{step.role}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
