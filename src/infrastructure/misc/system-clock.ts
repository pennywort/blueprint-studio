import type { IClock } from '@application/ports/clock';

// Адаптер IClock на системное время.
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
