import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  CornerDownLeft,
  FileText,
  History,
  Microscope,
  Search,
  Server,
  Settings,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { cx } from '@/utils/format';

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  to: string;
}

const COMMANDS: Command[] = [
  { id: 'overview', label: 'Go to Overview', hint: 'Dashboard', icon: Compass, to: '/' },
  { id: 'research', label: 'Go to Research', hint: 'Research Studio', icon: Microscope, to: '/research' },
  { id: 'content', label: 'Go to Content', hint: 'Content Studio', icon: FileText, to: '/content' },
  { id: 'workflow', label: 'View Workflow', hint: 'Architecture graph', icon: Workflow, to: '/workflow' },
  { id: 'history', label: 'View History', hint: 'Past runs', icon: History, to: '/history' },
  { id: 'services', label: 'System Services', hint: 'Health checks', icon: Server, to: '/services' },
  { id: 'settings', label: 'Settings', hint: 'Preferences', icon: Settings, to: '/settings' },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return COMMANDS;
    return COMMANDS.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.hint.toLowerCase().includes(needle),
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the open transition begins so the caret lands reliably.
      const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (command: Command) => {
    navigate(command.to);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      run(results[active]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] animate-fade-in" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px]" onClick={onClose} />

      <div className="relative mx-auto mt-[12vh] w-[min(560px,calc(100%-2rem))]">
        <div
          className="overflow-hidden rounded-panel border border-hairlineStrong bg-surface shadow-panel animate-fade-rise"
          onKeyDown={onKeyDown}
        >
          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <Search className="h-4 w-4 shrink-0 text-faint" strokeWidth={1.8} />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search commands…"
              aria-label="Search commands"
              className="h-12 w-full bg-transparent text-sm text-ink placeholder:text-faint focus:outline-none"
            />
            <kbd className="hidden shrink-0 rounded border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-2xs text-faint sm:block">
              ESC
            </kbd>
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                No commands match “{query.trim()}”.
              </p>
            ) : (
              results.map((command, index) => {
                const Icon = command.icon;
                const isActive = index === active;
                return (
                  <button
                    key={command.id}
                    type="button"
                    onClick={() => run(command)}
                    onMouseEnter={() => setActive(index)}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150',
                      isActive ? 'bg-interactive' : 'hover:bg-interactive/60',
                    )}
                  >
                    <Icon
                      className={cx('h-4 w-4 shrink-0', isActive ? 'text-accent' : 'text-faint')}
                      strokeWidth={1.7}
                    />
                    <span className="flex-1 truncate text-sm text-ink">{command.label}</span>
                    <span className="hidden truncate text-2xs text-faint sm:block">
                      {command.hint}
                    </span>
                    {isActive && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-faint" strokeWidth={1.8} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
