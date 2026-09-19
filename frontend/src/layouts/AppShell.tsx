import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { CommandPalette } from '@/components/CommandPalette';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { useTheme } from '@/hooks/useTheme';

/** The application shell: sidebar, topbar, command palette and routed content. */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { services } = useServiceHealth();
  const location = useLocation();

  // Cmd/Ctrl+K opens the palette from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Scroll to top on navigation; the drawer closes with it.
  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar open={navOpen} onClose={closeNav} services={services} />

      <div className="lg:pl-[248px]">
        <Topbar
          onMenu={() => setNavOpen(true)}
          onSearch={() => setPaletteOpen(true)}
          theme={theme}
          onToggleTheme={toggle}
        />
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
