import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '@/layouts/AppShell';
import { ContentStudio } from '@/pages/ContentStudio';
import { HistoryView } from '@/pages/HistoryView';
import { NotFound } from '@/pages/NotFound';
import { Overview } from '@/pages/Overview';
import { ResearchStudio } from '@/pages/ResearchStudio';
import { ServicesView } from '@/pages/ServicesView';
import { SettingsView } from '@/pages/SettingsView';
import { WorkflowView } from '@/pages/WorkflowView';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'research', element: <ResearchStudio /> },
      { path: 'content', element: <ContentStudio /> },
      { path: 'workflow', element: <WorkflowView /> },
      { path: 'history', element: <HistoryView /> },
      { path: 'services', element: <ServicesView /> },
      { path: 'settings', element: <SettingsView /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
