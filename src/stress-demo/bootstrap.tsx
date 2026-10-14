import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { buildContainer } from '@infrastructure/container';
import { App } from '@presentation/app/App';
import { createStressGraph, stressOptionsFromQuery } from '@presentation/features/canvas/stress-graph';

// Стенд лагов канваса: размеры графа — из query-строки
// (stress.html?levels=4&pagesPerLevel=25&elementsPerPage=6&forms=20&stepsPerForm=3&fieldsPerStep=8#/editor).
const options = stressOptionsFromQuery(window.location.search);
const container = buildContainer({ graphSeed: () => createStressGraph(options) });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Корневой элемент #root не найден в stress.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
