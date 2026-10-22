import { makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import {
  HIGHLIGHT_ENTITIES,
  HIGHLIGHT_KINDS,
  frameWidth,
  type HighlightEntity,
} from '@presentation/theme/highlight-policy';

// Рисование подсветки (R-PERF-6): одна геометрия для всех сущностей и видов —
// псевдоэлемент ::after внутри сущности под её содержимым (как inset-тень):
// размер не меняется ни на пиксель, handles и кнопки остаются поверх. Вид
// (толщина, линия, цвет, заливка) — из политики темы; правило на вид
// генерируется, ветвлений по виду в компонентах нет. Смена подсветки = смена
// одного атрибута data-highlight у одного элемента.
function entityRules(theme: EditorTheme, entity: HighlightEntity) {
  const { frames, inset } = theme.editor.highlight;
  const rules: Record<string, string | object> = {
    position: 'relative',
    // Свой контекст наложения: z-index −1 у рамки — над фоном сущности, под содержимым.
    isolation: 'isolate',
    '&[data-highlight]::after': {
      content: '""',
      position: 'absolute',
      inset: inset[entity],
      zIndex: -1,
      boxSizing: 'border-box',
      borderRadius: 'inherit',
      pointerEvents: 'none',
    },
  };
  for (const kind of HIGHLIGHT_KINDS) {
    const frame = frames[kind];
    rules[`&[data-highlight="${kind}"]::after`] = {
      border: `${frameWidth(frame, entity)}px ${frame.style} ${frame.color}`,
      backgroundColor: frame.fill ?? 'transparent',
    };
  }
  return rules;
}

export const useHighlightStyles = makeStyles<EditorTheme>((theme) =>
  Object.fromEntries(HIGHLIGHT_ENTITIES.map((entity) => [entity, entityRules(theme, entity)])),
);
