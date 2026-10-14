import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { buildContainer } from '@infrastructure/container';
import { App } from '@presentation/app/App';
import { createSampleGraph } from '@presentation/features/canvas/sample-graph';

// DI-контейнер создаётся явно здесь (конституция, железное правило 6):
// один контейнер на приложение, никаких импортируемых синглтонов.
const container = buildContainer({ graphSeed: createSampleGraph });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Корневой элемент #root не найден в index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App container={container} />
  </StrictMode>,
);
