import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { ElementSketchComponent } from './sketch-types';
import { DefaultSketch } from './default-sketch';

// Таблица «kind → набросок» [owner 2026-11-05, AGENTS.md §4a Open/Closed]:
// новый вид — новая запись здесь, ядро (ElementSketch, карточка) не правится.
// Сейчас пусто [owner 2026-11-19]: в дизайне контролы на канвасе не рисуются,
// все виды — текстом по card политики (DefaultSketch).
const SKETCHES: Readonly<Record<string, ElementSketchComponent>> = {};

export function sketchOf(kind: CanvasElementKind): ElementSketchComponent {
  return SKETCHES[kind] ?? DefaultSketch;
}
