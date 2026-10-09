// TEMPORARY SHIM — типы для index.js (см. комментарий там).
export * from 'react-dom';

export function findDOMNode(componentOrElement: unknown): Element | null;

declare const defaultExport: typeof import('react-dom') & {
  findDOMNode: typeof findDOMNode;
};
export default defaultExport;
