import type { IIdGenerator } from '@application/ports/id-generator';

// Адаптер IIdGenerator на crypto.randomUUID (доступен в браузере и Node 19+).
export class UuidIdGenerator implements IIdGenerator {
  next(): string {
    return crypto.randomUUID();
  }
}
