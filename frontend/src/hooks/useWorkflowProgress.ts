import { useCallback, useEffect, useRef, useState } from 'react';

import type { AgentPhase } from '@/types';

/**
 * Drives the agent-by-agent progress display during a run.
 *
 * The services return a single response rather than streaming per-agent events,
 * so this advances on a timer to show which stage is plausibly running. It is a
 * progress indication, not a report of server state: on completion every stage
 * is marked done, and on failure the active stage is marked failed.
 */
export function useWorkflowProgress(steps: string[], stepMs = 9_000) {
  const [phases, setPhases] = useState<AgentPhase[]>(() => steps.map(() => 'pending'));
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    setPhases(steps.map((_, index) => (index === 0 ? 'active' : 'pending')));
    timer.current = window.setInterval(() => {
      setPhases((current) => {
        const index = current.findIndex((phase) => phase === 'active');
        // Hold on the final stage until the response actually arrives.
        if (index === -1 || index === steps.length - 1) return current;
        const next = [...current];
        next[index] = 'done';
        next[index + 1] = 'active';
        return next;
      });
    }, stepMs);
  }, [steps, stepMs, stop]);

  const complete = useCallback(() => {
    stop();
    setPhases(steps.map(() => 'done'));
  }, [steps, stop]);

  const fail = useCallback(() => {
    stop();
    setPhases((current) => current.map((phase) => (phase === 'active' ? 'failed' : phase)));
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    setPhases(steps.map(() => 'pending'));
  }, [steps, stop]);

  useEffect(() => stop, [stop]);

  return { phases, start, complete, fail, reset };
}
