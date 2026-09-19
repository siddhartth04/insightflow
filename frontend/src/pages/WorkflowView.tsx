import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  applyNodeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowRight, X } from 'lucide-react';

import { AgentNode, type AgentFlowNode } from '@/components/AgentNode';
import { PageHeader } from '@/components/Section';
import { StatusDot } from '@/components/StatusDot';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import type { StatusKind } from '@/components/StatusDot';

const NODE_TYPES: NodeTypes = { agent: AgentNode };

interface AgentSpec {
  id: string;
  label: string;
  role: string;
  module: 'research' | 'content';
  x: number;
  y: number;
  kind?: 'agent' | 'module';
  next?: string;
}

const RESEARCH_AGENTS: AgentSpec[] = [
  { id: 'r-researcher', label: 'Researcher', role: 'Research and organize information', module: 'research', x: 40, y: 90, next: 'Analyst' },
  { id: 'r-analyst', label: 'Analyst', role: 'Identify themes and structure findings', module: 'research', x: 40, y: 240, next: 'Reviewer' },
  { id: 'r-reviewer', label: 'Reviewer', role: 'Review, sharpen and finalize the report', module: 'research', x: 40, y: 390 },
];

const CONTENT_AGENTS: AgentSpec[] = [
  { id: 'c-researcher', label: 'Researcher', role: 'Understand the topic and gather material', module: 'content', x: 360, y: 90, next: 'Strategist' },
  { id: 'c-strategist', label: 'Strategist', role: 'Set audience, angle, tone and structure', module: 'content', x: 360, y: 240, next: 'Writer' },
  { id: 'c-writer', label: 'Writer', role: 'Write the draft', module: 'content', x: 360, y: 390, next: 'Editor' },
  { id: 'c-editor', label: 'Editor', role: 'Polish grammar, clarity and structure', module: 'content', x: 360, y: 540 },
];

const EDGES: Edge[] = [
  { id: 'r1', source: 'r-researcher', target: 'r-analyst' },
  { id: 'r2', source: 'r-analyst', target: 'r-reviewer' },
  { id: 'c1', source: 'c-researcher', target: 'c-strategist' },
  { id: 'c2', source: 'c-strategist', target: 'c-writer' },
  { id: 'c3', source: 'c-writer', target: 'c-editor' },
  // The cross-module HTTP dependency.
  {
    id: 'cross',
    source: 'c-researcher',
    target: 'r-researcher',
    label: 'HTTP',
    animated: true,
    style: { strokeDasharray: '5 4' },
    labelStyle: { fill: 'rgb(var(--muted))', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: 'rgb(var(--elevated))' },
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
  },
].map((edge) => ({
  ...edge,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'rgb(var(--hairline-strong))' },
})) as Edge[];

export function WorkflowView() {
  const { services } = useServiceHealth();
  const [selected, setSelected] = useState<AgentSpec | null>(null);

  const statusFor = useCallback(
    (module: 'research' | 'content'): StatusKind =>
      services.find((service) => service.id === module)?.state ?? 'checking',
    [services],
  );

  const initialNodes = useMemo<AgentFlowNode[]>(
    () =>
      [...RESEARCH_AGENTS, ...CONTENT_AGENTS].map((spec) => ({
        id: spec.id,
        type: 'agent' as const,
        position: { x: spec.x, y: spec.y },
        data: {
          label: spec.label,
          role: spec.role,
          agentId: spec.label.toLowerCase(),
          module: spec.module,
          status: statusFor(spec.module),
        },
      })),
    [statusFor],
  );

  const [nodes, setNodes] = useState<AgentFlowNode[]>(initialNodes);

  // Keep live status flowing into nodes without discarding dragged positions.
  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: { ...node.data, status: statusFor(node.data.module) },
      })),
    [nodes, statusFor],
  );

  const onNodesChange: OnNodesChange<AgentFlowNode> = useCallback(
    (changes) => setNodes((current) => applyNodeChanges(changes, current)),
    [],
  );

  const allSpecs = useMemo(() => [...RESEARCH_AGENTS, ...CONTENT_AGENTS], []);

  return (
    <div className="space-y-6 animate-fade-rise">
      <PageHeader
        title="Workflow"
        description="How the two modules are composed, and how they talk to each other."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="h-2 w-2 rounded-sm bg-accent/70" />
                Agent
              </span>
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="h-px w-5 border-t border-dashed border-accent" />
                HTTP call
              </span>
            </div>
            <p className="text-2xs text-faint">Drag to explore &middot; click a node for detail</p>
          </div>

          <div className="h-[560px] w-full bg-canvas sm:h-[640px]">
            <ReactFlow
              nodes={displayNodes}
              edges={EDGES}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onNodeClick={(_, node) =>
                setSelected(allSpecs.find((spec) => spec.id === node.id) ?? null)
              }
              onPaneClick={() => setSelected(null)}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              minZoom={0.4}
              maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
              nodesConnectable={false}
              edgesFocusable={false}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={22}
                size={1}
                color="rgb(var(--hairline-strong))"
              />
              <Controls
                showInteractive={false}
                className="!rounded-lg !border !border-hairline !bg-surface !shadow-card"
              />
            </ReactFlow>
          </div>
        </section>

        {/* Detail panel */}
        <aside className="space-y-5">
          {selected ? (
            <section className="card animate-fade-rise p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight text-ink">
                  {selected.label}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close detail"
                  className="btn-ghost -mr-1.5 -mt-1 h-7 w-7 rounded-md p-0"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.9} />
                </button>
              </div>

              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="label">Module</dt>
                  <dd className="mt-1.5 text-sm capitalize text-ink">
                    {selected.module === 'research' ? 'Research' : 'Content Studio'}
                  </dd>
                </div>
                <div>
                  <dt className="label">Role</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted">{selected.role}</dd>
                </div>
                <div>
                  <dt className="label">Next agent</dt>
                  <dd className="mt-1.5 text-sm text-ink">
                    {selected.next ?? 'None — produces the final output'}
                  </dd>
                </div>
                <div>
                  <dt className="label">Status</dt>
                  <dd className="mt-1.5">
                    <StatusDot status={statusFor(selected.module)} />
                  </dd>
                </div>
              </dl>

              <Link
                to={selected.module === 'research' ? '/research' : '/content'}
                className="btn-secondary mt-5 w-full"
              >
                Open {selected.module === 'research' ? 'Research' : 'Content'}
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
              </Link>
            </section>
          ) : (
            <section className="card p-5">
              <h2 className="text-sm font-semibold tracking-tight text-ink">Architecture</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Two independent FastAPI services behind an Nginx reverse proxy. The Content
                module can call the Research module over HTTP; neither imports the other.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-hairline bg-elevated p-3.5">
                  <p className="label">Research</p>
                  <p className="mt-2 font-mono text-2xs text-muted">
                    Researcher &rarr; Analyst &rarr; Reviewer
                  </p>
                </div>
                <div className="rounded-lg border border-hairline bg-elevated p-3.5">
                  <p className="label">Content Studio</p>
                  <p className="mt-2 font-mono text-2xs leading-relaxed text-muted">
                    Researcher &rarr; Strategist &rarr; Writer &rarr; Editor
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-hairlineStrong bg-elevated p-3.5">
                  <p className="label">Cross-module</p>
                  <p className="mt-2 font-mono text-2xs text-muted">
                    Content &rarr; HTTP &rarr; Research
                  </p>
                </div>
              </div>

              <p className="mt-5 border-t border-hairline pt-4 text-2xs leading-relaxed text-faint">
                Click any node in the graph to see that agent in detail.
              </p>
            </section>
          )}

          <section className="card p-5">
            <h2 className="text-sm font-semibold tracking-tight text-ink">Live status</h2>
            <div className="mt-3.5 space-y-2.5">
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
          </section>
        </aside>
      </div>
    </div>
  );
}
