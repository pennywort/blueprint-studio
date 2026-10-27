import { z } from 'zod';
import editorConfigJson from './editor-config.json';

// Конфиг редактора (возможности UI, включаемые/отключаемые без правки кода,
// AGENTS §4a «обратимость решений»): смена = правка одного значения в
// editor-config.json. Отсутствующее поле — значение по умолчанию.
// - canvas.panTool: инструмент «Рука» (как в Figma) — кнопка панели канваса
//   и хоткей canvas.togglePanMode; в режиме руки выделение блоков, элементов
//   и связей заблокировано, drag по канвасу только двигает полотно.
// - canvas.navigation: схема колеса/трекпада (таблица CANVAS_NAVIGATION_SCHEMES
//   в features/canvas/canvas-navigation.ts): «figma» — скролл двигает полотно,
//   pinch и Ctrl/Cmd+колесо — масштаб; «zoom» — прежний дефолт react-flow.
const EditorConfigSchema = z.object({
  canvas: z
    .object({
      panTool: z.boolean().default(true),
      navigation: z.enum(['figma', 'zoom']).default('figma'),
    })
    .prefault({}),
});
export type EditorConfig = z.infer<typeof EditorConfigSchema>;

export const EDITOR_CONFIG: EditorConfig = EditorConfigSchema.parse(editorConfigJson);
