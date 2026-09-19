import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/services/api';
import type { HealthResponse } from '@/types';

export type ServiceState = 'checking' | 'online' | 'offline';

export interface ServiceStatus {
  id: 'research' | 'content';
  name: string;
  port: string;
  state: ServiceState;
  detail?: HealthResponse;
  error?: string;
}

const INITIAL: ServiceStatus[] = [
  { id: 'research', name: 'Research Service', port: '8001', state: 'checking' },
  { id: 'content', name: 'Content Service', port: '8002', state: 'checking' },
];

/**
 * Polls both service health endpoints. Status is always derived from a real
 * response -- nothing is ever reported as operational without a successful check.
 */
export function useServiceHealth(pollMs = 30_000) {
  const [services, setServices] = useState<ServiceStatus[]>(INITIAL);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  const check = useCallback(async () => {
    setChecking(true);
    const [research, content] = await Promise.allSettled([
      api.researchHealth(),
      api.contentHealth(),
    ]);
    if (!mounted.current) return;

    const toStatus = (
      base: ServiceStatus,
      outcome: PromiseSettledResult<HealthResponse>,
    ): ServiceStatus =>
      outcome.status === 'fulfilled'
        ? { ...base, state: 'online', detail: outcome.value, error: undefined }
        : {
            ...base,
            state: 'offline',
            detail: undefined,
            error:
              outcome.reason instanceof Error
                ? outcome.reason.message
                : 'Unable to connect',
          };

    setServices([toStatus(INITIAL[0], research), toStatus(INITIAL[1], content)]);
    setLastChecked(Date.now());
    setChecking(false);
  }, []);

  useEffect(() => {
    mounted.current = true;
    void check();
    const timer = window.setInterval(() => void check(), pollMs);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [check, pollMs]);

  return { services, lastChecked, checking, refresh: check };
}
