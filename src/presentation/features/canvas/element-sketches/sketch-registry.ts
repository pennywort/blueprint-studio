import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { ElementSketchComponent } from './sketch-types';
import { DefaultSketch } from './default-sketch';
import { ListItemSketch } from './list-item-sketch';
import {
  AlertSketch,
  ButtonSketch,
  CheckboxSketch,
  FieldSketch,
  RadioGroupSketch,
  SelectSketch,
  TypographySketch,
} from './control-sketches';

// Таблица «kind → набросок» [owner 2026-11-05, AGENTS.md §4a Open/Closed]:
// новый вид — новая запись здесь, ядро (ElementSketch, карточка) не правится.
// Вид без записи рисуется наброском по умолчанию.
const SKETCHES: Readonly<Record<string, ElementSketchComponent>> = {
  'list-item': ListItemSketch,
  'text-field': FieldSketch,
  'date-range-field-picker': FieldSketch,
  select: SelectSketch,
  checkbox: CheckboxSketch,
  'radio-group': RadioGroupSketch,
  button: ButtonSketch,
  alert: AlertSketch,
  typography: TypographySketch,
};

export function sketchOf(kind: CanvasElementKind): ElementSketchComponent {
  return SKETCHES[kind] ?? DefaultSketch;
}
