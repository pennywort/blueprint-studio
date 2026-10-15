import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { buildContainer } from '@infrastructure/container';
import { App } from '@presentation/app/App';
import { createSampleGraph } from '@presentation/features/canvas/sample-graph';
import { createStressGraph, stressOptionsFromQuery } from '@presentation/features/canvas/stress-graph';

// DI-контейнер создаётся явно здесь (конституция, железное правило 6):
// один контейнер на приложение, никаких импортируемых синглтонов.
// Проект «Стенд производительности» (project=stress): размеры графа — из query
// (?project=stress&levels=4&pagesPerLevel=25&elementsPerPage=6&forms=20&stepsPerForm=3&fieldsPerStep=8).
const container = buildContainer({
  graphSeed: (projectId, search) =>
    projectId === 'stress' ? createStressGraph(stressOptionsFromQuery(search)) : createSampleGraph(),
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Корневой элемент #root не найден в index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
