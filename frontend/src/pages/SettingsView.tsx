import { Moon, Sun, Trash2 } from 'lucide-react';

import { PageHeader, SectionHeader } from '@/components/Section';
import { useHistory } from '@/hooks/useHistory';
import { useTheme } from '@/hooks/useTheme';
import { cx } from '@/utils/format';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { entries, clear } = useHistory();

  return (
    <div className="max-w-3xl space-y-6 animate-fade-rise">
      <PageHeader
        title="Settings"
        description="Preferences for this browser. Model and service configuration lives in the backend environment."
      />

      <section className="card p-5 sm:p-6">
        <SectionHeader title="Appearance" description="Dark is the default theme." />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(
            [
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
            ] as const
          ).map((option) => {
            const Icon = option.icon;
            const active = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setTheme(option.id)}
                className={cx(
                  'flex items-center gap-3 rounded-lg border px-4 py-3.5 text-left transition-all duration-200 ease-subtle',
                  active
                    ? 'border-accent/55 bg-accent/10'
                    : 'border-hairline bg-elevated hover:border-hairlineStrong hover:bg-interactive',
                )}
              >
                <Icon
                  className={cx('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-faint')}
                  strokeWidth={1.7}
                />
                <span className={cx('text-sm font-medium', active ? 'text-accent' : 'text-ink')}>
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeader
          title="Run history"
          description="Stored in this browser only. It is never sent to a server."
        />
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-elevated px-4 py-3.5">
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">{entries.length}</span>{' '}
            {entries.length === 1 ? 'run' : 'runs'} recorded
          </p>
          <button
            type="button"
            onClick={clear}
            disabled={entries.length === 0}
            className="btn-secondary h-8 px-3 text-xs text-critical hover:border-critical/40"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            Clear history
          </button>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <SectionHeader
          title="Model configuration"
          description="Set on the backend; never exposed to the browser."
        />
        <div className="mt-5 space-y-3">
          <p className="text-sm leading-relaxed text-muted">
            The model is configured through{' '}
            <code className="rounded bg-interactive px-1.5 py-0.5 font-mono text-xs text-ink">
              LLM_MODEL
            </code>{' '}
            and the matching provider key in each service&apos;s environment. API keys are read by
            the services only and are never sent to the frontend.
          </p>
          <pre className="overflow-x-auto rounded-lg border border-hairline bg-canvas p-4 font-mono text-xs leading-relaxed text-muted">
{`LLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=sk-...
RESEARCH_SERVICE_URL=http://research:8001`}
          </pre>
          <p className="text-xs leading-relaxed text-faint">
            See the Services page for what each running service currently reports.
          </p>
        </div>
      </section>
    </div>
  );
}
