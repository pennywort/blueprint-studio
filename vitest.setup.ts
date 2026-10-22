// Моки jsdom для @xyflow/react по официальному testing-гайду xyflow:
// https://reactflow.dev/learn/advanced-use/testing
// ResizeObserver сразу вызывает callback с contentRect 800x600, чтобы
// ReactFlow смонтировался без реальных измерений layout.

// TEMPORARY (пока UI на MUI v4): MUI v4 — CJS-пакет и в тестах
// ходит в react-dom нативным require, минуя vite-alias 'react-dom$' на
// vendor-полифилл. Поэтому здесь findDOMNode из того же полифилла
// проставляется в живой модуль react-dom (общий с @material-ui
// require-cache). createRequire специально грузит настоящий пакет.
import { createRequire } from 'node:module';
import { findDOMNode } from './vendor/react-dom-find-dom-node/index.js';

const nodeRequire = createRequire(import.meta.url);
// В @types/react-dom 19 findDOMNode удалён вместе с рантаймом — расширяем тип локально.
type ReactDomWithFindDomNode = typeof import('react-dom') & {
  findDOMNode?: (componentOrElement: unknown) => Element | null;
};
const RealReactDOM = nodeRequire('react-dom') as ReactDomWithFindDomNode;

if (typeof RealReactDOM.findDOMNode !== 'function') {
  RealReactDOM.findDOMNode = findDOMNode;
}

class ResizeObserverMock implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [
        {
          target,
          contentRect: { width: 800, height: 600 },
        } as unknown as ResizeObserverEntry,
      ],
      this,
    );
  }

  unobserve(): void {}

  disconnect(): void {}
}

// d3-zoom читает масштаб из DOMMatrixReadOnly.m22 при разборе transform.
class DOMMatrixReadOnlyMock {
  readonly m22: number;

  constructor(transform?: string) {
    const scale = transform?.match(/scale\((\d+(\.\d+)?)\)/)?.[1];
    this.m22 = scale !== undefined ? Number(scale) : 1;
  }
}

Object.defineProperties(globalThis.HTMLElement.prototype, {
  offsetHeight: {
    configurable: true,
    get(this: HTMLElement) {
      return parseFloat(this.style.height) || 600;
    },
  },
  offsetWidth: {
    configurable: true,
    get(this: HTMLElement) {
      return parseFloat(this.style.width) || 800;
    },
  },
});

// В lib.dom getBBox живёт на SVGGraphicsElement, а не SVGElement.
Object.assign(globalThis.SVGElement.prototype, {
  getBBox: () => ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect,
});

globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverMock;
globalThis.DOMMatrixReadOnly =
  globalThis.DOMMatrixReadOnly ?? (DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly);
