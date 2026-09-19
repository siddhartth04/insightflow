import { Menu, Moon, Search, Sun } from 'lucide-react';

import { LogoMark } from '@/components/Logo';
import type { Theme } from '@/hooks/useTheme';

interface TopbarProps {
  onMenu: () => void;
  onSearch: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Topbar({ onMenu, onSearch, theme, onToggleTheme }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-hairline bg-canvas/85 px-4 backdrop-blur-md lg:px-7">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="btn-ghost h-9 w-9 rounded-md p-0 lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      <div className="flex items-center gap-2 lg:hidden">
        <LogoMark size={24} />
        <span className="text-sm font-semibold tracking-tight text-ink">InsightFlow</span>
      </div>

      {/* Search trigger doubles as the command palette entry point. */}
      <button
        type="button"
        onClick={onSearch}
        className="group ml-auto flex h-9 items-center gap-2.5 rounded-lg border border-hairline bg-surface px-3 text-sm text-faint transition-all duration-200 hover:border-hairlineStrong hover:text-muted lg:ml-0 lg:w-[300px]"
      >
        <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
        <span className="hidden flex-1 text-left lg:block">Search or jump to…</span>
        <kbd className="hidden shrink-0 rounded border border-hairline bg-elevated px-1.5 py-0.5 font-mono text-2xs lg:block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          className="btn-ghost h-9 w-9 rounded-md p-0"
        >
          {theme === 'dark' ? (
            <Sun className="h-[17px] w-[17px]" strokeWidth={1.7} />
          ) : (
            <Moon className="h-[17px] w-[17px]" strokeWidth={1.7} />
          )}
        </button>

        <div className="h-5 w-px bg-hairline" />

        {/* Local, single-user workspace: the avatar is an identity mark, not an account menu. */}
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border border-hairlineStrong bg-elevated text-2xs font-semibold text-muted"
          title="Workspace"
          aria-label="Workspace"
        >
          IF
        </div>
      </div>
    </header>
  );
}
