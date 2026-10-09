// TEMPORARY (owner decision 2026-10-09): MUI v4 (временная подмена Flamingo,
// пока недоступен внутренний @sber-friend registry) вызывает ReactDOM.findDOMNode,
// удалённый из react-dom 19. Бандлер алиасит точный импорт 'react-dom' на этот
// файл (rsbuild.config.ts / vitest.config.ts); реальный пакет подтягивается
// относительным путём, чтобы обойти и сам alias, и exports-мапу react-dom.
// MUI v4 вешает ref на DOM-элементы напрямую, поэтому polyfill возвращает сам узел.
// Удалить вместе с vendor/flamingo при возврате на настоящий Flamingo.
import RealReactDOM from '../../node_modules/react-dom/index.js';

export * from '../../node_modules/react-dom/index.js';

export function findDOMNode(componentOrElement) {
  if (componentOrElement == null) {
    return null;
  }
  if (typeof componentOrElement.nodeType === 'number') {
    return componentOrElement;
  }
  return null;
}

// Default-импорт (react-transition-group: `import ReactDOM from 'react-dom'`)
// должен нести и findDOMNode тоже.
export default { ...RealReactDOM, findDOMNode };
