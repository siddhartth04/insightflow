import { NavLink } from 'react-router-dom';
import {
  Compass,
  FileText,
  History,
  Microscope,
  Server,
  Settings,
  Workflow,
  X,
} from 'lucide-react';

import { Wordmark } from '@/components/Logo';
import { StatusDot } from '@/components/StatusDot';
import type { ServiceStatus } from '@/hooks/useServiceHealth';
import { cx } from '@/utils/format';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  services: ServiceStatus[];
}

const PRIMARY = [
  { to: '/', label: 'Overview', icon: Compass, end: true },
  { to: '/research', label: 'Research', icon: Microscope },
  { to: '/content', label: 'Content', icon: FileText },
];

const SECONDARY = [
  { to: '/workflow', label: 'Workflow', icon: Workflow },
  { to: '/history', label: 'History', icon: History },
  { to: '/services', label: 'Services', icon: Server },
];

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onNavigate,
}: {
  to: string;
  label: string;
  icon: typeof Compass;
  end?: boolean;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-subtle',
          isActive
            ? 'bg-interactive font-medium text-ink'
            : 'text-muted hover:bg-interactive/60 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active marker rail */}
          <span
            aria-hidden
            className={cx(
              'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-accent transition-opacity duration-200',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon
            className={cx(
              'h-[17px] w-[17px] shrink-0 transition-colors',
              isActive ? 'text-accent' : 'text-faint group-hover:text-muted',
            )}
            strokeWidth={1.7}
          />
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

export function Sidebar({ open, onClose, services }: SidebarProps) {
  const allOnline = services.every((service) => service.state === 'online');
  const anyChecking = services.some((service) => service.state === 'checking');

  return (
    <>
      {/* Mobile scrim */}
      <div
        aria-hidden
        onClick={onClose}
        className={cx(
          'fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col border-r border-hairline bg-surface',
          'transition-transform duration-300 ease-subtle lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4">
          <Wordmark showTagline />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="btn-ghost -mr-1.5 h-8 w-8 rounded-md p-0 lg:hidden"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
          <div className="space-y-0.5">
            {PRIMARY.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={onClose} />
            ))}
          </div>

          <div className="my-4 border-t border-hairline" />

          <div className="space-y-0.5">
            {SECONDARY.map((item) => (
              <NavItem key={item.to} {...item} onNavigate={onClose} />
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-hairline p-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              cx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                isActive
                  ? 'bg-interactive font-medium text-ink'
                  : 'text-muted hover:bg-interactive/60 hover:text-ink',
              )
            }
          >
            <Settings className="h-[17px] w-[17px] text-faint" strokeWidth={1.7} />
            Settings
          </NavLink>

          <div className="mt-2 flex items-center justify-between rounded-lg border border-hairline bg-elevated px-3 py-2">
            <span className="text-2xs font-medium text-faint">System</span>
            <StatusDot
              status={anyChecking ? 'checking' : allOnline ? 'online' : 'warning'}
              label={anyChecking ? 'Checking' : allOnline ? 'All systems go' : 'Degraded'}
            />
          </div>
        </div>
      </aside>
    </>
  );
}
