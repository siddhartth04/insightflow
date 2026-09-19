import { useCallback, useMemo, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Compass,
  Download,
  FileText,
  FlaskConical,
  PenLine,
  RefreshCw,
  ScanSearch,
  Sparkles,
  SpellCheck,
  TriangleAlert,
} from 'lucide-react';

import { PageHeader, SectionHeader } from '@/components/Section';
import { EmptyState, ErrorState, SkeletonLines } from '@/components/States';
import { WorkflowTracker, type TrackerStep } from '@/components/WorkflowTracker';
import { useCopy } from '@/hooks/useCopy';
import { recordRun } from '@/hooks/useHistory';
import { useWorkflowProgress } from '@/hooks/useWorkflowProgress';
import { ApiError, api } from '@/services/api';
import type { ContentResponse, ContentType, Tone } from '@/types';
import { cx, downloadText, formatDuration, slugify } from '@/utils/format';
import { renderMarkdown } from '@/utils/markdown';

const STEPS: TrackerStep[] = [
  { id: 'researcher', name: 'Researcher', role: 'Gathers material', icon: ScanSearch },
  { id: 'strategist', name: 'Strategist', role: 'Sets angle and structure', icon: Compass },
  { id: 'writer', name: 'Writer', role: 'Writes the draft', icon: PenLine },
  { id: 'editor', name: 'Editor', role: 'Polishes the piece', icon: SpellCheck },
];

const CONTENT_TYPES: { id: ContentType; label: string }[] = [
  { id: 'linkedin', label: 'LinkedIn Post' },
  { id: 'technical_article', label: 'Technical Article' },
  { id: 'blog_post', label: 'Blog Post' },
  { id: 'product_description', label: 'Product Description' },
  { id: 'research_summary', label: 'Research Summary' },
];

const TONES: { id: Tone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'conversational', label: 'Conversational' },
  { id: 'authoritative', label: 'Authoritative' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'technical', label: 'Technical' },
];

function toMarkdown(response: ContentResponse): string {
  return `# ${response.result.title}\n\n${response.result.body}\n`;
}

export function ContentStudio() {
  const [topic, setTopic] = useState('');
  const [contentType, setContentType] = useState<ContentType>('linkedin');
  const [tone, setTone] = useState<Tone>('professional');
  const [useResearch, setUseResearch] = useState(false);
  const [running, setRunning] = useState(false);
  const [content, setContent] = useState<ContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

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
    setContent(null);
    setEditing(false);
    start();

    const startedAt = Date.now();
    try {
      const response = await api.runContent({
        topic: trimmed,
        content_type: contentType,
        tone,
        use_research: useResearch,
      });
      complete();
      setContent(response);
      setDraft(response.result.body);
      recordRun({
        module: 'content',
        type: CONTENT_TYPES.find((item) => item.id === response.content_type)?.label ?? 'Content',
        task: response.result.title || response.topic,
        status: 'completed',
        durationMs: response.duration_ms || Date.now() - startedAt,
        generated: response.generated,
        payload: response,
      });
    } catch (caught) {
      fail();
      const message =
        caught instanceof ApiError ? caught.message : 'The Content service could not be reached.';
      setError(message);
      recordRun({
        module: 'content',
        type: CONTENT_TYPES.find((item) => item.id === contentType)?.label ?? 'Content',
        task: trimmed,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        generated: false,
        error: message,
      });
    } finally {
      setRunning(false);
    }
  }, [trimmed, contentType, tone, useResearch, start, complete, fail]);

  const clear = useCallback(() => {
    setContent(null);
    setError(null);
    setEditing(false);
    reset();
  }, [reset]);

  const displayBody = editing ? draft : content?.result.body ?? '';

  return (
    <div className="space-y-6 animate-fade-rise">
      <PageHeader
        title="Content Studio"
        description="Transform an idea into a polished, publishable piece."
        actions={
          content ? (
            <button type="button" onClick={clear} className="btn-secondary h-9 px-3 text-xs">
              New run
            </button>
          ) : null
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Input panel */}
        <section className="card p-5 sm:p-6">
          <SectionHeader title="Brief" description="What should be written, and how." />

          <div className="mt-5 space-y-5">
            <div>
              <label htmlFor="content-topic" className="label mb-2 block">
                Topic
              </label>
              <textarea
                id="content-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canRun) {
                    event.preventDefault();
                    void run();
                  }
                }}
                rows={3}
                maxLength={500}
                disabled={running}
                placeholder="e.g. Explain retrieval-augmented generation to software engineers"
                className="field resize-none leading-relaxed"
              />
              <p className="mt-1.5 text-right text-2xs tabular-nums text-faint">
                {topic.length}/500
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="content-type" className="label mb-2 block">
                  Content type
                </label>
                <select
                  id="content-type"
                  value={contentType}
                  disabled={running}
                  onChange={(event) => setContentType(event.target.value as ContentType)}
                  className="field cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23879' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  }}
                >
                  {CONTENT_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="content-tone" className="label mb-2 block">
                  Tone
                </label>
                <select
                  id="content-tone"
                  value={tone}
                  disabled={running}
                  onChange={(event) => setTone(event.target.value as Tone)}
                  className="field cursor-pointer appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23879' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                  }}
                >
                  {TONES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cross-module toggle */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-hairline bg-elevated px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">Use research</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Calls the Research service first and grounds the content in its report.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={useResearch}
                aria-label="Use research"
                disabled={running}
                onClick={() => setUseResearch((value) => !value)}
                className={cx(
                  'relative mt-0.5 h-[22px] w-10 shrink-0 rounded-full border transition-colors duration-250 ease-subtle disabled:opacity-50',
                  useResearch ? 'border-accent/50 bg-accent/85' : 'border-hairline bg-interactive',
                )}
              >
                <span
                  className={cx(
                    'absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform duration-250 ease-subtle',
                    useResearch ? 'translate-x-[21px]' : 'translate-x-[3px]',
                  )}
                />
              </button>
            </div>

            <button type="button" onClick={run} disabled={!canRun} className="btn-primary w-full">
              {running ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Generating&hellip;
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={1.9} />
                  Generate content
                </>
              )}
            </button>
          </div>
        </section>

        {/* Workflow panel */}
        <section className="card h-fit p-5">
          <SectionHeader title="Workflow" description="Four agents, run in sequence." />
          <div className="mt-5">
            <WorkflowTracker steps={STEPS} phases={phases} />
          </div>
          {useResearch && (
            <p className="mt-4 border-t border-hairline pt-4 text-2xs leading-relaxed text-faint">
              The Research module runs first over HTTP, before the Researcher agent.
            </p>
          )}
        </section>
      </div>

      {/* Output */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Generated content</h2>
            {content && (
              <p className="mt-1 truncate text-xs text-faint">
                {content.result.word_count} words &middot; {formatDuration(content.duration_ms)}
              </p>
            )}
          </div>

          {content && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copy(editing ? draft : toMarkdown(content))}
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
                onClick={() => setEditing((value) => !value)}
                className={cx('h-8 px-2.5 text-xs', editing ? 'btn-primary' : 'btn-secondary')}
              >
                <PenLine className="h-3.5 w-3.5" strokeWidth={1.8} />
                {editing ? 'Done' : 'Edit'}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    `${slugify(content.result.title)}.md`,
                    editing ? `# ${content.result.title}\n\n${draft}\n` : toMarkdown(content),
                  )
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
            <div className="skeleton h-5 w-2/3" />
            <SkeletonLines lines={5} />
            <SkeletonLines lines={4} />
            <p className="text-center text-xs text-faint">Content workflow running&hellip;</p>
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={run} />
        ) : content ? (
          <div className="animate-fade-in">
            {!content.generated && (
              <div className="mx-6 mt-6 flex items-start gap-3 rounded-lg border border-caution/30 bg-caution/[0.07] px-4 py-3 sm:mx-7">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-caution" strokeWidth={1.8} />
                <p className="text-xs leading-relaxed text-muted">
                  <span className="font-medium text-ink">Preview output.</span> No LLM credentials
                  are configured, so this shows the output structure rather than generated content.
                </p>
              </div>
            )}

            {content.research_error && (
              <div className="mx-6 mt-6 flex items-start gap-3 rounded-lg border border-caution/30 bg-caution/[0.07] px-4 py-3 sm:mx-7">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-caution" strokeWidth={1.8} />
                <p className="text-xs leading-relaxed text-muted">
                  <span className="font-medium text-ink">Research step skipped.</span>{' '}
                  {content.research_error}
                </p>
              </div>
            )}

            <div className="grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_260px]">
              {/* The piece itself, presented as a document. */}
              <article className="min-w-0">
                <h1 className="text-xl font-semibold leading-snug tracking-tight text-ink text-balance">
                  {content.result.title}
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="chip">
                    {CONTENT_TYPES.find((item) => item.id === content.content_type)?.label}
                  </span>
                  <span className="chip capitalize">{content.tone}</span>
                  {content.used_research && (
                    <span className="chip border-accent/30 text-accent">Research-grounded</span>
                  )}
                </div>

                <div className="mt-6 border-t border-hairline pt-6">
                  {editing ? (
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      rows={22}
                      aria-label="Edit content"
                      className="field resize-y font-mono text-[0.8125rem] leading-relaxed"
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(displayBody) }} />
                  )}
                </div>
              </article>

              {/* Strategy sidebar */}
              <aside className="space-y-4 lg:border-l lg:border-hairline lg:pl-6">
                <div>
                  <p className="label mb-2.5">Strategy</p>
                  <dl className="space-y-3">
                    {[
                      ['Audience', content.result.strategy.audience],
                      ['Angle', content.result.strategy.angle],
                      ['Key message', content.result.strategy.key_message],
                    ]
                      .filter(([, value]) => Boolean(value))
                      .map(([term, value]) => (
                        <div key={term}>
                          <dt className="text-2xs font-medium uppercase tracking-wider text-faint">
                            {term}
                          </dt>
                          <dd className="mt-1 text-xs leading-relaxed text-muted">{value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>

                {content.result.strategy.structure.length > 0 && (
                  <div className="border-t border-hairline pt-4">
                    <p className="label mb-2.5">Structure</p>
                    <ol className="space-y-1.5">
                      {content.result.strategy.structure.map((item, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-relaxed text-muted">
                          <span className="font-mono text-faint">{index + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {content.result.editor_notes.length > 0 && (
                  <div className="border-t border-hairline pt-4">
                    <p className="label mb-2.5">Editor notes</p>
                    <ul className="space-y-2">
                      {content.result.editor_notes.map((note, index) => (
                        <li key={index} className="flex gap-2 text-xs leading-relaxed text-muted">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-positive" strokeWidth={2.2} />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No content yet."
            description="Describe a topic, pick a format, and generate a polished draft you can edit, copy or download."
          />
        )}
      </section>
    </div>
  );
}
