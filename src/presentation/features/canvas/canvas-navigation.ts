import { PanOnScrollMode, type ReactFlowProps } from '@xyflow/react';
import type { EditorConfig } from '@presentation/app/editor-config';

// Схемы навигации по канвасу колесом мыши и трекпадом (замечание владельца
// 2026-10-27, AGENTS §4a «обратимость решений»): выбор — значение
// canvas.navigation в editor-config.json, новая схема — запись в таблице,
// компонент канваса не правится.
type CanvasNavigationProps = Pick<
  ReactFlowProps,
  'panOnScroll' | 'panOnScrollMode' | 'panOnScrollSpeed' | 'zoomOnScroll' | 'zoomOnPinch'
>;

export const CANVAS_NAVIGATION_SCHEMES: Record<EditorConfig['canvas']['navigation'], CanvasNavigationProps> =
  {
    // Как в Figma: два пальца/колесо двигают полотно в любую сторону;
    // масштаб — щипок (pinch) или колесо с Ctrl/Cmd (zoomActivationKeyCode
    // react-flow по умолчанию).
    figma: {
      panOnScroll: true,
      panOnScrollMode: PanOnScrollMode.Free,
      // 1:1 с движением пальцев (дефолт react-flow 0.5 — полотно «отстаёт»).
      panOnScrollSpeed: 1,
      zoomOnScroll: false,
      zoomOnPinch: true,
    },
    // Дефолт react-flow: любое колесо/скролл трекпада меняет масштаб.
    zoom: {
      panOnScroll: false,
      zoomOnScroll: true,
      zoomOnPinch: true,
    },
  };
