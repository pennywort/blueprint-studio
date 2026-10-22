// TEMPORARY (owner decision 2026-10-09): MUI v4 вызывает ReactDOM.findDOMNode,
// удалённый из react-dom 19. Бандлер алиасит точный импорт 'react-dom' на этот
// файл (rsbuild.config.ts / vitest.config.ts); реальный пакет подтягивается
// относительным путём, чтобы обойти и сам alias, и exports-мапу react-dom.
// MUI v4 вешает ref на DOM-элементы напрямую, поэтому polyfill возвращает сам узел.
// Удалить при уходе с MUI v4.
import RealReactDOM from '../../node_modules/react-dom/index.js';

export * from '../../node_modules/react-dom/index.js';

export function findDOMNode(componentOrElement) {
  if (componentOrElement == null) {
    return null;
  }
  if (typeof componentOrElement.nodeType === 'number') {
    return componentOrElement;
  }
  // Классовый компонент (react-transition-group зовёт findDOMNode(this) из
  // Transition — так MUI v4 Grow/Popover получают узел): спускаемся по fiber
  // до первого host-узла. _reactInternals присутствует в React 19 (проверено).
  let fiber = componentOrElement._reactInternals;
  while (fiber) {
    if (fiber.stateNode && typeof fiber.stateNode.nodeType === 'number') {
      return fiber.stateNode;
    }
    fiber = fiber.child;
  }
  return null;
}

// Default-импорт (react-transition-group: `import ReactDOM from 'react-dom'`)
// должен нести и findDOMNode тоже.
export default { ...RealReactDOM, findDOMNode };
