// Порт генератора идентификаторов (конституция, железное правило 2).
export interface IIdGenerator {
  next(): string;
}
