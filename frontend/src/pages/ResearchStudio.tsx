import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Download,
  FlaskConical,
  Layers,
  Lightbulb,
  Microscope,
  RefreshCw,
  ScanSearch,
  Sparkles,
} from 'lucide-react';

import { PageHeader, SectionHeader } from '@/components/Section';
import { EmptyState, ErrorState, SkeletonLines } from '@/components/States';
import { WorkflowTracker, type TrackerStep } from '@/components/WorkflowTracker';
import { useCopy } from '@/hooks/useCopy';
import { recordRun } from '@/hooks/useHistory';
import { useWorkflowProgress } from '@/hooks/useWorkflowProgress';
import { ApiError, api } from '@/services/api';
import type { Depth, ResearchResponse } from '@/types';
import { cx, downloadText, formatDuration, slugify } from '@/utils/format';
import { renderMarkdown } from '@/utils/markdown';

const STEPS: TrackerStep[] = [
  { id: 'researcher', name: 'Researcher', role: 'Gathers and organizes', icon: ScanSearch },
  { id: 'analyst', name: 'Analyst', role: 'Finds themes and structure', icon: Layers },
  { id: 'reviewer', name: 'Reviewer', role: 'Sharpens and finalizes', icon: Check },
];

const DEPTHS: { id: Depth; label: string; hint: string }[] = [
  { id: 'quick', label: 'Quick', hint: '3 subtopics' },
  { id: 'standard', label: 'Standard', hint: '4-5 subtopics' },
  { id: 'deep', label: 'Deep', hint: '6-7 subtopics' },
];

/** Serialize a report to markdown for copy and download. */
function toMarkdown(response: ResearchResponse): string {
  const { topic, result } = response;
  const lines = [
    `# ${topic}`,
    '',
    '## Executive Summary',
    '',
    result.summary,
    '',
    '## Key Findings',
    '',
    ...result.key_findings.map((finding) => `- ${finding}`),
    '',
    '## Detailed Analysis',
    '',
    result.analysis,
    '',
  ];
  if (result.insights.length) {
    lines.push('## Important Insights', '', ...result.insights.map((i) => `- ${i}`), '');
  }
  if (result.conclusion) lines.push('## Conclusion', '', result.conclusion, '');
  if (result.limitations) lines.push('## Limitations', '', result.limitations, '');
  return lines.join('\n');
}

export function ResearchStudio() {
  const [topic, setTopic] = useState('');
  const [depth, setDepth] = useState<Depth>('standard');
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ResearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { phases, start, complete, fail, reset } = useWorkflowProgress(
    useMemo(() => STEPS.map((step) => step.id), []),
  );
  const { copied, copy } = useCopy();

  const trimmed = topic.trim();
  const canRun = trimmed.length >= 3 && !running;

  const run = useCallback(async () => {
    if (trimmed.length < 3) {
      setError('Enter a topic of at least 3 characters to begin.');
      return;
    }

    setRunning(true);
    setError(null);
    setReport(null);
    start();

    const startedAt = Date.now();
    try {
      const response = await api.runResearch({ topic: trimmed, depth });
      complete();
      setReport(response);
      recordRun({
        module: 'research',
        type: 'Research',
        task: response.topic,
        status: 'completed',
        durationMs: response.duration_ms || Date.now() - startedAt,
        generated: response.generated,
        payload: response,
      });
    } catch (caught) {
      fail();
      const message =
        caught instanceof ApiError
          ? caught.message
          : 'The Research service could not be reached.';
      setError(message);
      recordRun({
        module: 'research',
        type: 'Research',
        task: trimmed,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        generated: false,
        error: message,
      });
    } finally {
      setRunning(false);
    }
  }, [trimmed, depth, start, complete, fail]);

  const clear = useCallback(() => {
    setReport(null);
    setError(null);
    reset();
  }, [reset]);

  return (
    <div className="space-y-6 animate-fade-rise">
      <PageHeader
        title="Research Studio"
        description="Turn a question into structured insight through a multi-agent workflow."
        actions={
          report ? (
            <button type="button" onClick={clear} className="btn-secondary h-9 px-3 text-xs">
              New run
            </button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Input panel */}
        <section className="card p-5 sm:p-6">
          <SectionHeader
            title="Research input"
            description="Describe what you want investigated."
          />

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="topic" className="label mb-2 block">
                Topic
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  // Cmd/Ctrl+Enter submits without leaving the textarea.
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canRun) {
                    event.preventDefault();
                    void run();
                  }
                }}
                rows={4}
                maxLength={500}
                disabled={running}
                placeholder="e.g. The impact of AI agents on software development practices"
                className="field resize-none leading-relaxed"
              />
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-2xs text-faint">
                  <kbd className="rounded border border-hairline bg-elevated px-1 py-0.5 font-mono">
                    &#8984;
                  </kbd>
                  {' + '}
                  <kbd className="rounded border border-hairline bg-elevated px-1 py-0.5 font-mono">
                    Enter
                  </kbd>{' '}
                  to run
                </p>
                <p className="text-2xs tabular-nums text-faint">{topic.length}/500</p>
              </div>
            </div>

            <div>
              <span className="label mb-2 block">Depth</span>
              <div
                role="radiogroup"
                aria-label="Research depth"
                className="grid grid-cols-3 gap-2"
              >
                {DEPTHS.map((option) => {
                  const active = depth === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={running}
                      onClick={() => setDepth(option.id)}
                      className={cx(
                        'rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ease-subtle disabled:opacity-50',
                        active
                          ? 'border-accent/55 bg-accent/10'
                          : 'border-hairline bg-elevated hover:border-hairlineStrong hover:bg-interactive',
                      )}
                    >
                      <span
                        className={cx(
                          'block text-sm font-medium',
                          active ? 'text-accent' : 'text-ink',
                        )}
                      >
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-2xs text-faint">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={run} disabled={!canRun} className="btn-primary w-full">
              {running ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Running workflow&hellip;
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={1.9} />
                  Start research
                </>
              )}
            </button>
          </div>
        </section>

        {/* Workflow panel */}
        <section className="card h-fit p-5">
          <SectionHeader title="Workflow" description="Three agents, run in sequence." />
          <div className="mt-5">
            <WorkflowTracker steps={STEPS} phases={phases} />
          </div>

          {running && (
            <p className="mt-4 border-t border-hairline pt-4 text-2xs leading-relaxed text-faint">
              Stages advance on an estimated cadence; the report arrives when the full workflow
              finishes.
            </p>
          )}
        </section>
      </div>

      {/* Result */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Research result</h2>
            {report && (
              <p className="mt-1 truncate text-xs text-faint">
                {formatDuration(report.duration_ms)} &middot; {report.model}
              </p>
            )}
          </div>

          {report && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copy(toMarkdown(report))}
                className="btn-secondary h-8 px-2.5 text-xs"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-positive" strokeWidth={2} />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5" strokeWidth={1.8} />
                )}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(`${slugify(report.topic)}-research.md`, toMarkdown(report))
                }
                className="btn-secondary h-8 px-2.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
                Download
              </button>
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="btn-secondary h-8 px-2.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
                Regenerate
              </button>
            </div>
          )}
        </div>

        {running ? (
          <div className="space-y-6 p-6 sm:p-7">
            <div>
              <div className="skeleton mb-3 h-3 w-40" />
              <SkeletonLines lines={4} />
            </div>
            <div>
              <div className="skeleton mb-3 h-3 w-32" />
              <SkeletonLines lines={3} />
            </div>
            <p className="text-center text-xs text-faint">Research workflow running&hellip;</p>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={run} />
        ) : report ? (
          <ReportView report={report} />
        ) : (
          <EmptyState
            icon={Microscope}
            title="No research yet."
            description="Enter a topic above to begin. The workflow returns a structured report you can copy or download."
          />
        )}
      </section>
    </div>
  );
}

function ReportView({ report }: { report: ResearchResponse }) {
  const { result } = report;

  return (
    <article className="animate-fade-in p-6 sm:p-7">
      {!report.generated && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-caution/30 bg-caution/[0.07] px-4 py-3">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-caution" strokeWidth={1.8} />
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-medium text-ink">Preview output.</span> No LLM credentials are
            configured, so this shows the report structure rather than generated analysis.
          </p>
        </div>
      )}

      <h1 className="text-xl font-semibold leading-snug tracking-tight text-ink text-balance">
        {report.topic}
      </h1>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="chip capitalize">{report.depth}</span>
        <span className="chip">{result.key_findings.length} findings</span>
        {result.insights.length > 0 && (
          <span className="chip">{result.insights.length} insights</span>
        )}
      </div>

      <Block title="Executive Summary">
        <div
          className="text-[0.9375rem]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(result.summary) }}
        />
      </Block>

      {result.key_findings.length > 0 && (
        <Block title="Key Findings">
          <ol className="space-y-2.5">
            {result.key_findings.map((finding, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-lg border border-hairline bg-elevated px-4 py-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/12 font-mono text-2xs font-semibold text-accent">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-muted">{finding}</span>
              </li>
            ))}
          </ol>
        </Block>
      )}

      <Block title="Detailed Analysis">
        <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.analysis) }} />
      </Block>

      {result.insights.length > 0 && (
        <Block title="Important Insights">
          <ul className="space-y-2.5">
            {result.insights.map((insight, index) => (
              <li key={index} className="flex gap-3">
                <Lightbulb
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  strokeWidth={1.7}
                />
                <span className="text-sm leading-relaxed text-muted">{insight}</span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {result.conclusion && (
        <Block title="Conclusion">
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(result.conclusion) }} />
        </Block>
      )}

      {result.limitations && (
        <Block title="Limitations">
          <div className="rounded-lg border border-hairline bg-elevated px-4 py-3">
            <div
              className="text-sm [&_p]:mb-0"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(result.limitations) }}
            />
          </div>
        </Block>
      )}
    </article>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-hairline pt-6 first-of-type:border-t-0">
      <h2 className="label mb-3.5">{title}</h2>
      {children}
    </section>
  );
}
