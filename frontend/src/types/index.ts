/** Contracts mirrored from the FastAPI services. */

export type Depth = 'quick' | 'standard' | 'deep';

export interface ResearchResult {
  summary: string;
  key_findings: string[];
  analysis: string;
  insights: string[];
  conclusion: string;
  limitations: string;
}

export interface ResearchResponse {
  status: string;
  topic: string;
  depth: Depth;
  result: ResearchResult;
  duration_ms: number;
  model: string;
  generated: boolean;
}

export type ContentType =
  | 'linkedin'
  | 'technical_article'
  | 'blog_post'
  | 'product_description'
  | 'research_summary';

export type Tone =
  | 'professional'
  | 'conversational'
  | 'authoritative'
  | 'friendly'
  | 'technical';

export interface ContentStrategy {
  audience: string;
  angle: string;
  tone: string;
  structure: string[];
  key_message: string;
}

export interface ContentResult {
  title: string;
  body: string;
  strategy: ContentStrategy;
  editor_notes: string[];
  word_count: number;
}

export interface ContentResponse {
  status: string;
  topic: string;
  content_type: ContentType;
  tone: Tone;
  used_research: boolean;
  research_error: string | null;
  result: ContentResult;
  duration_ms: number;
  model: string;
  generated: boolean;
}

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  description: string;
  next_agent: string | null;
}

export interface ModuleMetadata {
  module_id: string;
  module_name: string;
  version: string;
  status: string;
  agents: string[];
  agent_details: AgentInfo[];
  model: string;
  llm_available: boolean;
  /** Content service only. */
  content_types?: { id: string; label: string }[];
  tones?: string[];
  research_service_url?: string;
  research_available?: boolean;
}

export interface HealthResponse {
  status: string;
  module: string;
  version: string;
  llm_available: boolean;
  research_reachable?: boolean;
}

export type ModuleId = 'research' | 'content';

export type RunStatus = 'completed' | 'failed';

/** A row in the locally stored run history. */
export interface HistoryEntry {
  id: string;
  module: ModuleId;
  type: string;
  task: string;
  status: RunStatus;
  createdAt: number;
  durationMs: number;
  generated: boolean;
  payload?: ResearchResponse | ContentResponse;
  error?: string;
}

export type AgentPhase = 'pending' | 'active' | 'done' | 'failed';
