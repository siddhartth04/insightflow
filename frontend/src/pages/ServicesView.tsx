import { useEffect, useState } from 'react';
import { RefreshCw, Server } from 'lucide-react';

import { PageHeader } from '@/components/Section';
import { StatusDot } from '@/components/StatusDot';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { api } from '@/services/api';
import type { ModuleMetadata } from '@/types';
import { cx, relativeTime } from '@/utils/format';

/**
 * Every status shown here comes from an actual health response. A service is
 * only ever reported as operational after a successful check.
 */
export function ServicesView() {
  const { services, lastChecked, checking, refresh } = useServiceHealth();
  const [metadata, setMetadata] = useState<Record<string, ModuleMetadata>>({});

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      const [research, content] = await Promise.allSettled([
        api.researchMetadata(controller.signal),
        api.contentMetadata(controller.signal),
      ]);
      const next: Record<string, ModuleMetadata> = {};
      if (research.status === 'fulfilled') next.research = research.value;
      if (content.status === 'fulfilled') next.content = content.value;
      setMetadata(next);
    })();
    return () => controller.abort();
  }, [services]);

  // LiteLLM is reachable only through the services, so its status is reported
  // as what we can actually observe rather than probed directly from here.
  const llmConfigured = Object.values(metadata).some((meta) => meta.llm_available);
  const anyServiceUp = services.some((service) => service.state === 'online');

  return (
    <div className="space-y-6 animate-fade-rise">
      <PageHeader
        title="System Services"
        description="Live health of each backend service."
        actions={
          <button
            type="button"
            onClick={refresh}
            disabled={checking}
            className="btn-secondary h-9 px-3 text-xs"
          >
            <RefreshCw
              className={cx('h-3.5 w-3.5', checking && 'animate-spin')}
              strokeWidth={1.8}
            />
            Refresh
          </button>
        }
      />

      {lastChecked && (
        <p className="-mt-2 text-xs text-faint">
          Last checked {relativeTime(lastChecked)} &middot; re-checks automatically every 30s
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {services.map((service) => {
          const meta = metadata[service.id];
          return (
            <section key={service.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-elevated text-faint">
                    <Server className="h-[18px] w-[18px]" strokeWidth={1.7} />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-tight text-ink">
                      {service.name}
                    </h2>
                    <p className="mt-1 font-mono text-xs text-faint">:{service.port}</p>
                  </div>
                </div>
                <StatusDot status={service.state} />
              </div>

              {service.state === 'offline' ? (
                <div className="mt-4 rounded-lg border border-critical/25 bg-critical/[0.07] px-3.5 py-3">
                  <p className="text-xs font-medium text-critical">Unable to connect</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {service.error ?? 'The service did not respond to a health check.'}
                  </p>
                </div>
              ) : service.state === 'checking' ? (
                <div className="mt-4 space-y-2">
                  <div className="skeleton h-3 w-2/3" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ) : (
                <dl className="mt-4 space-y-2.5 border-t border-hairline pt-4">
                  <Row label="Version" value={service.detail?.version ?? '—'} mono />
                  <Row
                    label="Model"
                    value={meta?.model ?? '—'}
                    mono
                  />
                  <Row
                    label="LLM credentials"
                    value={service.detail?.llm_available ? 'Configured' : 'Not configured'}
                    tone={service.detail?.llm_available ? 'positive' : 'caution'}
                  />
                  {service.id === 'content' && (
                    <Row
                      label="Research dependency"
                      value={service.detail?.research_reachable ? 'Reachable' : 'Unreachable'}
                      tone={service.detail?.research_reachable ? 'positive' : 'caution'}
                    />
                  )}
                  {meta && (
                    <Row label="Agents" value={meta.agents.join(' → ')} />
                  )}
                </dl>
              )}
            </section>
          );
        })}
      </div>

      {/* LiteLLM */}
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-elevated text-faint">
              <Server className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold tracking-tight text-ink">LiteLLM</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Model abstraction used by both services. It is reached from the backend only, so
                its state is reported from what the services report about their own credentials.
              </p>
            </div>
          </div>
          <StatusDot
            status={!anyServiceUp ? 'checking' : llmConfigured ? 'online' : 'warning'}
            label={
              !anyServiceUp
                ? 'Unknown'
                : llmConfigured
                  ? 'Credentials configured'
                  : 'No credentials'
            }
          />
        </div>

        {anyServiceUp && !llmConfigured && (
          <p className="mt-4 rounded-lg border border-caution/25 bg-caution/[0.07] px-3.5 py-3 text-xs leading-relaxed text-muted">
            No provider key is configured, so both services return clearly labelled preview output
            instead of generated results. Set <code className="font-mono text-ink">OPENAI_API_KEY</code>{' '}
            (or another provider key) in your <code className="font-mono text-ink">.env</code> and
            restart.
          </p>
        )}
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'positive' | 'caution';
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-xs text-faint">{label}</dt>
      <dd
        className={cx(
          'min-w-0 truncate text-right text-xs',
          mono && 'font-mono',
          tone === 'positive' && 'text-positive',
          tone === 'caution' && 'text-caution',
          !tone && 'text-ink',
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
