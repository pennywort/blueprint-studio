// Превью нативного dnd на масштабированном канвасе (доводка N2): браузер снимает
// картинку перетаскиваемого элемента в его собственном размере и не учитывает
// transform: scale() вьюпорта react-flow — при зуме < 1 превью выглядело
// огромным. Подменяем снимок масштабированным клоном через
// DataTransfer.setDragImage. Масштаб берём из геометрии самого элемента
// (экранная ширина / layout-ширина): без подписки на стор react-flow и без
// ре-рендеров карточек при зуме (стенд производительности, конституция §7).

import type { DragEvent } from 'react';

// Масштаб в пределах этого допуска считаем единичным: нативное превью верно.
const UNIT_ZOOM_EPSILON = 0.01;

// Вызывать из onDragStart источника (currentTarget = перетаскиваемый элемент).
// Клон живёт в DOM лишь до снятия снимка браузером — на следующей макрозадаче.
export function setScaledDragPreview(event: DragEvent<HTMLElement>): void {
  const source = event.currentTarget;
  const layoutWidth = source.offsetWidth;
  const rect = source.getBoundingClientRect();
  if (layoutWidth <= 0 || rect.width <= 0) {
    return;
  }
  const zoom = rect.width / layoutWidth;
  if (Math.abs(zoom - 1) < UNIT_ZOOM_EPSILON) {
    return;
  }

  const ghost = source.cloneNode(true) as HTMLElement;
  // Клон не должен попадать в селекторы тестов/drop-зон и дублировать якоря.
  ghost.removeAttribute('draggable');
  ghost.removeAttribute('data-testid');
  ghost.removeAttribute('data-element-card');
  ghost.querySelectorAll('[data-testid], [data-element-card]').forEach((node) => {
    node.removeAttribute('data-testid');
    node.removeAttribute('data-element-card');
  });
  ghost.style.width = `${layoutWidth}px`;
  ghost.style.margin = '0';
  ghost.style.transformOrigin = '0 0';
  ghost.style.transform = `scale(${zoom})`;

  // Обёртка имеет уже масштабированные размеры: снимок берётся по ней.
  const holder = document.createElement('div');
  holder.style.cssText =
    `position:fixed;top:-10000px;left:-10000px;width:${rect.width}px;` +
    `height:${rect.height}px;overflow:hidden;pointer-events:none;`;
  holder.appendChild(ghost);
  document.body.appendChild(holder);

  // Смещение курсора уже в экранных пикселях — точка хвата остаётся прежней.
  event.dataTransfer.setDragImage(holder, event.clientX - rect.left, event.clientY - rect.top);
  setTimeout(() => holder.remove(), 0);
}
