import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Microscope, PenLine, Plus, Workflow } from 'lucide-react';

import { ModuleCard } from '@/components/ModuleCard';
import { SectionHeader } from '@/components/Section';
import { StatusDot } from '@/components/StatusDot';
import { useHistory } from '@/hooks/useHistory';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { greeting, relativeTime, truncate } from '@/utils/format';

const QUICK_ACTIONS = [
  { to: '/research', label: 'New Research', icon: Microscope },
  { to: '/content', label: 'Create Content', icon: PenLine },
  { to: '/workflow', label: 'View Workflow', icon: Workflow },
];

/** A compact, static depiction of a pipeline. */
function PipelinePreview({ label, steps }: { label: string; steps: string[] }) {
  return (
    <div className="rounded-lg border border-hairline bg-elevated p-4">
      <p className="label">{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((step, index) => (
          <span key={step} className="flex items-center gap-2">
            <span className="rounded-md bg-interactive px-2 py-1 text-2xs font-medium text-muted">
              {step}
            </span>
            {index < steps.length - 1 && (
              <span aria-hidden className="text-faint">
                &rarr;
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Overview() {
  const { services } = useServiceHealth();
  const { entries } = useHistory();

  const research = services.find((service) => service.id === 'research');
  const content = services.find((service) => service.id === 'content');
  const recent = entries.slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-rise">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-card border border-hairline bg-surface px-6 py-10 sm:px-10 sm:py-14">
        <div aria-hidden className="dot-grid pointer-events-none absolute inset-0 opacity-[0.55]" />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/[0.06] blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-muted">{greeting()}.</p>
          <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.18] tracking-tight text-ink text-balance sm:text-[2.125rem]">
            Turn ideas into structured insight
            <br className="hidden sm:block" /> and polished content.
          </h1>
          <p className="mt-4 max-w-lg text-[0.9375rem] leading-relaxed text-muted text-pretty">
            Research deeply. Think clearly. Create confidently.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            <Link to="/research" className="btn-primary">
              <Plus className="h-4 w-4" strokeWidth={2} />
              Start research
            </Link>
            <Link to="/content" className="btn-secondary">
              Create content
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </section>

      {/* Module cards */}
      <section className="grid gap-5 lg:grid-cols-2">
        <ModuleCard
          title="Research"
          description="Explore topics through a structured multi-agent research workflow."
          agents={['Researcher', 'Analyst', 'Reviewer']}
          to="/research"
          cta="Open Research"
          icon={Microscope}
          status={research?.state ?? 'checking'}
        />
        <ModuleCard
          title="Content Studio"
          description="Transform ideas and research into polished, publishable content."
          agents={['Researcher', 'Strategist', 'Writer', 'Editor']}
          to="/content"
          cta="Open Content"
          icon={FileText}
          status={content?.state ?? 'checking'}
        />
      </section>

      {/* Status, activity, actions */}
      <section className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5">
          <SectionHeader title="Module status" description="Live health checks." />
          <div className="mt-4 space-y-2.5">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border border-hairline bg-elevated px-3.5 py-2.5"
              >
                <span className="text-sm text-ink">
                  {service.id === 'research' ? 'Research' : 'Content'}
                </span>
                <StatusDot status={service.state} />
              </div>
            ))}
          </div>

          <div className="mt-5 space-y-2.5">
            <PipelinePreview label="Research flow" steps={['Research', 'Analysis', 'Review']} />
            <PipelinePreview
              label="Content flow"
              steps={['Research', 'Strategy', 'Write', 'Edit']}
            />
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <SectionHeader
            title="Recent activity"
            description="Runs recorded in this browser."
            actions={
              entries.length > 0 ? (
                <Link to="/history" className="btn-ghost h-8 px-2.5 text-xs">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </Link>
              ) : null
            }
          />

          {recent.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-hairline px-5 py-10 text-center">
              <p className="text-sm font-medium text-ink">No runs yet.</p>
              <p className="mt-1.5 text-sm text-muted">
                Start a research run or create content to see activity here.
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {recent.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-3 first:pt-1">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-elevated text-faint">
                    {entry.module === 'research' ? (
                      <Microscope className="h-4 w-4" strokeWidth={1.7} />
                    ) : (
                      <FileText className="h-4 w-4" strokeWidth={1.7} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{truncate(entry.task, 64)}</p>
                    <p className="mt-0.5 text-xs text-faint">
                      {entry.type} &middot; {relativeTime(entry.createdAt)}
                    </p>
                  </div>
                  <StatusDot
                    status={entry.status === 'completed' ? 'online' : 'offline'}
                    label={entry.status === 'completed' ? 'Completed' : 'Failed'}
                    className="hidden sm:inline-flex"
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 border-t border-hairline pt-5">
            <p className="label">Quick actions</p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex items-center gap-2.5 rounded-lg border border-hairline bg-elevated px-3.5 py-3 text-sm text-ink transition-all duration-200 ease-subtle hover:border-hairlineStrong hover:bg-interactive"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.7} />
                    <span className="truncate">{action.label}</span>
                    <ArrowRight
                      className="ml-auto h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-200 group-hover:translate-x-0.5"
                      strokeWidth={1.8}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
