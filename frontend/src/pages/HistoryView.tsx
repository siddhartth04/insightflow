import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, History, Microscope, Trash2 } from 'lucide-react';

import { PageHeader } from '@/components/Section';
import { StatusDot } from '@/components/StatusDot';
import { EmptyState } from '@/components/States';
import { useHistory } from '@/hooks/useHistory';
import type { HistoryEntry } from '@/types';
import { cx, formatDuration, relativeTime, truncate } from '@/utils/format';

type Filter = 'all' | 'research' | 'content' | 'completed' | 'failed';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'research', label: 'Research' },
  { id: 'content', label: 'Content' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

function matches(entry: HistoryEntry, filter: Filter): boolean {
  switch (filter) {
    case 'research':
    case 'content':
      return entry.module === filter;
    case 'completed':
    case 'failed':
      return entry.status === filter;
    default:
      return true;
  }
}

export function HistoryView() {
  const { entries, clear, remove } = useHistory();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = useMemo(
    () => entries.filter((entry) => matches(entry, filter)),
    [entries, filter],
  );

  return (
    <div className="space-y-6 animate-fade-rise">
      <PageHeader
        title="History"
        description="Runs recorded in this browser. Nothing is sent anywhere or stored on a server."
        actions={
          entries.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="btn-secondary h-9 px-3 text-xs text-critical hover:border-critical/40"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              Clear all
            </button>
          ) : null
        }
      />

      {entries.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => {
            const active = filter === option.id;
            const count = entries.filter((entry) => matches(entry, option.id)).length;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={cx(
                  'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-subtle',
                  active
                    ? 'border-accent/50 bg-accent/10 text-accent'
                    : 'border-hairline bg-elevated text-muted hover:border-hairlineStrong hover:text-ink',
                )}
              >
                {option.label}
                <span className={cx('ml-1.5 tabular-nums', active ? 'text-accent/70' : 'text-faint')}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <section className="card overflow-hidden">
        {entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No runs yet."
            description="Research reports and generated content appear here once you run a workflow."
          >
            <div className="flex flex-wrap justify-center gap-2.5">
              <Link to="/research" className="btn-secondary h-9 px-3 text-xs">
                Start research
              </Link>
              <Link to="/content" className="btn-secondary h-9 px-3 text-xs">
                Create content
              </Link>
            </div>
          </EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nothing matches this filter."
            description="Try a different filter to see other runs."
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-hairline">
                  {['Type', 'Task', 'Module', 'Status', 'Created', ''].map((heading) => (
                    <th
                      key={heading}
                      scope="col"
                      className="px-5 py-3 text-2xs font-semibold uppercase tracking-[0.13em] text-faint"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {visible.map((entry) => (
                  <tr key={entry.id} className="transition-colors duration-150 hover:bg-elevated/70">
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="flex items-center gap-2 text-sm text-ink">
                        {entry.module === 'research' ? (
                          <Microscope className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
                        ) : (
                          <FileText className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
                        )}
                        {entry.type}
                      </span>
                    </td>
                    <td className="max-w-sm px-5 py-3.5">
                      <p className="truncate text-sm text-ink">{truncate(entry.task, 72)}</p>
                      {entry.error && (
                        <p className="mt-0.5 truncate text-xs text-critical">{entry.error}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="chip capitalize">{entry.module}</span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <StatusDot
                        status={entry.status === 'completed' ? 'online' : 'offline'}
                        label={entry.status === 'completed' ? 'Completed' : 'Failed'}
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <p className="text-sm text-muted">{relativeTime(entry.createdAt)}</p>
                      <p className="mt-0.5 text-2xs text-faint">
                        {formatDuration(entry.durationMs)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        aria-label={`Remove ${entry.task}`}
                        className="btn-ghost h-8 w-8 rounded-md p-0 hover:text-critical"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-hairline md:hidden">
              {visible.map((entry) => (
                <li key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {entry.module === 'research' ? (
                        <Microscope className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.7} />
                      )}
                      <span className="truncate text-xs font-medium text-muted">{entry.type}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(entry.id)}
                      aria-label={`Remove ${entry.task}`}
                      className="btn-ghost -mr-1.5 -mt-1 h-7 w-7 shrink-0 rounded-md p-0 hover:text-critical"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  </div>

                  <p className="mt-2 text-sm leading-snug text-ink">{truncate(entry.task, 90)}</p>
                  {entry.error && <p className="mt-1 text-xs text-critical">{entry.error}</p>}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <StatusDot
                      status={entry.status === 'completed' ? 'online' : 'offline'}
                      label={entry.status === 'completed' ? 'Completed' : 'Failed'}
                    />
                    <span className="text-2xs text-faint">
                      {relativeTime(entry.createdAt)} &middot; {formatDuration(entry.durationMs)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
