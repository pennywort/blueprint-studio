import type { InvariantViolation } from '@domain/invariants';

// Бросается командой, если её применение нарушает доменные инварианты
// (конституция, железное правило 5: hard rules — доменные валидаторы).
export class InvariantViolationError extends Error {
  constructor(public readonly violations: InvariantViolation[]) {
    super(
      `Нарушены доменные инварианты: ${violations
        .map((violation) => `[${violation.rule}] ${violation.path}: ${violation.message}`)
        .join('; ')}`,
    );
    this.name = 'InvariantViolationError';
  }
}
