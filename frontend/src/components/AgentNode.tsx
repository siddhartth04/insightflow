import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import {
  Check,
  Compass,
  Layers,
  PenLine,
  ScanSearch,
  Server,
  SpellCheck,
  type LucideIcon,
} from 'lucide-react';

import { StatusDot, type StatusKind } from '@/components/StatusDot';
import { cx } from '@/utils/format';

const ICONS: Record<string, LucideIcon> = {
  researcher: ScanSearch,
  analyst: Layers,
  reviewer: Check,
  strategist: Compass,
  writer: PenLine,
  editor: SpellCheck,
  service: Server,
};

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  role: string;
  agentId: string;
  module: 'research' | 'content';
  status: StatusKind;
  kind?: 'agent' | 'module';
}

export type AgentFlowNode = Node<AgentNodeData, 'agent'>;

/** A custom React Flow node representing one agent or one module. */
export function AgentNode({ data, selected }: NodeProps<AgentFlowNode>) {
  const Icon = ICONS[data.agentId] ?? ICONS.service;
  const isModule = data.kind === 'module';

  return (
    <div
      className={cx(
        'w-[196px] rounded-xl border bg-surface px-3.5 py-3 transition-all duration-200 ease-subtle',
        selected
          ? 'border-accent/70 shadow-lift'
          : 'border-hairline shadow-card hover:border-hairlineStrong',
        isModule && 'border-dashed bg-elevated',
      )}
    >
      <Handle type="target" position={Position.Top} className="!-top-1" />

      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
            isModule
              ? 'border-hairlineStrong bg-interactive text-muted'
              : 'border-accent/25 bg-accent/10 text-accent',
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.7} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium leading-tight text-ink">
            {data.label}
          </p>
          <p className="mt-1 line-clamp-2 text-2xs leading-snug text-faint">{data.role}</p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-hairline pt-2.5">
        <span className="text-2xs font-medium uppercase tracking-wider text-faint">
          {data.module}
        </span>
        <StatusDot status={data.status} bare />
      </div>

      <Handle type="source" position={Position.Bottom} className="!-bottom-1" />
    </div>
  );
}
