/**
 * API client.
 *
 * Requests always use relative `/api/*` paths so that Nginx (in Docker) or the
 * Vite dev proxy (locally) decides where they go. Service hosts and ports are
 * never referenced from the browser.
 */
import type {
  ContentResponse,
  ContentType,
  Depth,
  HealthResponse,
  ModuleMetadata,
  Tone,
} from '@/types';

const RESEARCH = '/api/research';
const CONTENT = '/api/content';

/** An error already phrased for a person to read. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function friendlyStatusMessage(status: number, service: string): string {
  if (status === 422) return 'That request was not valid. Please check the form and try again.';
  if (status === 404) return `The ${service} endpoint was not found.`;
  if (status === 429) return 'Too many requests right now. Please wait a moment and try again.';
  if (status === 502 || status === 503)
    return `The ${service} service could not complete the request. It may be starting up or missing an API key.`;
  if (status === 504) return `The ${service} service took too long to respond.`;
  if (status >= 500) return `The ${service} service ran into a problem.`;
  return `The ${service} request failed (HTTP ${status}).`;
}

async function request<T>(
  url: string,
  service: string,
  init?: RequestInit,
  timeoutMs = 240_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (error) {
    // Network-level failure: the service is down, or the request timed out.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(`The ${service} service took too long to respond.`, 504);
    }
    throw new ApiError(`The ${service} service could not be reached.`, 0);
  } finally {
    window.clearTimeout(timer);
  }

  if (!response.ok) {
    // Prefer the service's own message when it sent a readable one.
    let detail = '';
    try {
      const body = await response.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      /* body was not JSON; fall back to a status-based message */
    }
    throw new ApiError(detail || friendlyStatusMessage(response.status, service), response.status);
  }

  return (await response.json()) as T;
}

export interface ResearchInput {
  topic: string;
  depth: Depth;
}

export interface ContentInput {
  topic: string;
  content_type: ContentType;
  tone: Tone;
  use_research: boolean;
  audience?: string;
}

export const api = {
  researchHealth: (signal?: AbortSignal) =>
    request<HealthResponse>(`${RESEARCH}/health`, 'Research', { signal }, 8_000),

  contentHealth: (signal?: AbortSignal) =>
    request<HealthResponse>(`${CONTENT}/health`, 'Content', { signal }, 8_000),

  researchMetadata: (signal?: AbortSignal) =>
    request<ModuleMetadata>(`${RESEARCH}/metadata`, 'Research', { signal }, 8_000),

  contentMetadata: (signal?: AbortSignal) =>
    request<ModuleMetadata>(`${CONTENT}/metadata`, 'Content', { signal }, 8_000),

  runResearch: (input: ResearchInput) =>
    request<import('@/types').ResearchResponse>(`${RESEARCH}/run`, 'Research', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  runContent: (input: ContentInput) =>
    request<ContentResponse>(`${CONTENT}/run`, 'Content', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
