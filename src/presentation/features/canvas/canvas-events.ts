// Цель клика — элемент управления внутри узла/карточки (кнопка, коннектор):
// такой клик выполняет действие и не меняет выделение.
export function isActionTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button, .react-flow__handle') !== null;
}
