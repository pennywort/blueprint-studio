import { createContext, useContext } from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import type { AwilixContainer } from 'awilix';
import type { Cradle } from '@infrastructure/container';
import { ProjectListPage } from '@presentation/pages/project-list/ProjectListPage';
import { EditorPage } from '@presentation/pages/editor/EditorPage';
import { PreviewPage } from '@presentation/pages/preview/PreviewPage';
import { SettingsPage } from '@presentation/pages/settings/SettingsPage';

// Контейнер доступен фичам через контекст; конкретные адаптеры infrastructure
// напрямую не импортируются (конституция, раздел 3).
const ContainerContext = createContext<AwilixContainer<Cradle> | null>(null);

export function useContainer(): AwilixContainer<Cradle> {
  const container = useContext(ContainerContext);
  if (!container) {
    throw new Error('DI-контейнер не инициализирован: App должен получить container в props');
  }
  return container;
}

// Hash-роутинг: любой роут открывается без серверных rewrite (handoff, решения).
const router = createHashRouter([
  { path: '/', element: <ProjectListPage /> },
  { path: '/editor', element: <EditorPage /> },
  { path: '/preview', element: <PreviewPage /> },
  { path: '/settings', element: <SettingsPage /> },
]);

export function App({ container }: { container: AwilixContainer<Cradle> }) {
  return (
    <ContainerContext.Provider value={container}>
      <RouterProvider router={router} />
    </ContainerContext.Provider>
  );
}
