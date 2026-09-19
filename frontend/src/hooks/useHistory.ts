import { useCallback, useEffect, useState } from 'react';

import type { HistoryEntry } from '@/types';

const STORAGE_KEY = 'insightflow.history';
const MAX_ENTRIES = 50;
const CHANGE_EVENT = 'insightflow:history';

function read(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    // Corrupt or unavailable storage should never break the app.
    return [];
  }
}

function write(entries: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota exceeded or storage disabled -- history is a convenience, not critical */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Append a run to history from anywhere, without needing the hook. */
export function recordRun(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): void {
  const full: HistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  };
  write([full, ...read()]);
}

/** Run history, persisted locally and synchronised across tabs. */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(read);

  useEffect(() => {
    const refresh = () => setEntries(read());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const clear = useCallback(() => write([]), []);

  const remove = useCallback((id: string) => {
    write(read().filter((entry) => entry.id !== id));
  }, []);

  return { entries, clear, remove };
}
