import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import { buildContainer } from '@infrastructure/container';
import { createEmptyServiceGraph } from '@domain/model/service-graph';
import { App } from '@presentation/app/App';
import { createSampleGraph } from '@presentation/features/canvas/sample-graph';
import { createStressGraph, stressOptionsFromQuery } from '@presentation/features/canvas/stress-graph';
import { keybindingsSettings } from '@presentation/features/hotkeys/keybindings-settings';

// DI-контейнер создаётся явно здесь (конституция, железное правило 6):
// один контейнер на приложение, никаких импортируемых синглтонов.
// Проект «Стенд производительности» (project=stress): размеры графа — из query
// (?project=stress&levels=4&pagesPerLevel=25&elementsPerPage=6&forms=20&stepsPerForm=3&fieldsPerStep=8).
// Любой другой project — id сохранённой карты [owner 2026-10-15]: до загрузки
// из хранилища редактор показывает пустой граф с этим id.
const container = buildContainer({
  graphSeed: (projectId, search) => {
    if (projectId === 'stress') {
      return createStressGraph(stressOptionsFromQuery(search));
    }
    const sample = createSampleGraph();
    return projectId === null || projectId === sample.id
      ? sample
      : createEmptyServiceGraph(projectId, 'Новый проект');
  },
  // Настройки администратора (R-ADM, [owner 2026-10-22]): пока — файл рядом
  // со сборкой (public/config), относительный путь (конституция §7); бэкенд —
  // смена URL. Опрос — правка файла на стенде доходит до всех без перезагрузки.
  adminSettings: { url: 'config/editor-settings.json', pollIntervalMs: 15_000 },
  settingsSections: [keybindingsSettings],
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Корневой элемент #root не найден в index.html');
}

// Первый рендер — уже с настройками администратора (без мигания умолчаний;
// load не бросает — при ошибке работают умолчания), дальше изменения
// применяются на лету.
const settings = container.cradle.editorSettings;
void settings.load().then(() => {
  settings.watch();
  createRoot(rootElement).render(
    <StrictMode>
      <App container={container} />
    </StrictMode>,
  );
});
