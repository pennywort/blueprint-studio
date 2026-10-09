// Порт часов: время в тестах подменяется адаптером, а не jest.useFakeTimers().
export interface IClock {
  now(): Date;
}
