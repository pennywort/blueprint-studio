import { memo } from 'react';
import type { ElementSketchProps } from './sketch-types';
import { sketchOf } from './sketch-registry';

// Единая точка отрисовки содержимого карточки элемента [owner 2026-11-05]:
// набросок по kind из таблицы. memo с узкими пропсами (kind, ссылка на props из
// ServiceBlueprint, строки каталога): подсветка/выделение карточки набросок
// не перерисовывают; превью dnd — клон DOM карточки (drag-preview.ts), т. е.
// тот же набросок, отдельного механизма нет.
export const ElementSketch = memo(function ElementSketch(props: ElementSketchProps) {
  const Sketch = sketchOf(props.kind);
  return <Sketch {...props} />;
});
