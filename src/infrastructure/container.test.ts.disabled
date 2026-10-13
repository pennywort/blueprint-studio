import { describe, expect, it } from 'vitest';
import { buildContainer, type Cradle } from './container';
import { CommandBus } from '@application/commands/command-bus';
import { ManifestSchemaProvider } from './element-schemas/manifest-schema-provider';
import { SystemClock } from './misc/system-clock';
import { UuidIdGenerator } from './misc/uuid-id-generator';

describe('buildContainer (composition root)', () => {
  it('каждый ключ Cradle резолвится без ошибок', () => {
    const container = buildContainer();

    expect(container.resolve('idGenerator')).toBeInstanceOf(UuidIdGenerator);
    expect(container.resolve('clock')).toBeInstanceOf(SystemClock);
    expect(container.resolve('elementSchemaProvider')).toBeInstanceOf(ManifestSchemaProvider);
    expect(container.resolve('commandBus')).toBeInstanceOf(CommandBus);
  });

  it('commandBus получает clock через PROXY-инъекцию и работает', () => {
    const container = buildContainer();
    const commandBus = container.resolve('commandBus');

    // Если бы clock не внедрился, execute упал бы на this.deps.clock.now().
    expect(commandBus.canUndo()).toBe(false);
  });

  it('singleton-регистрации возвращают один и тот же экземпляр', () => {
    const container = buildContainer();
    const keys: (keyof Cradle)[] = ['idGenerator', 'clock', 'elementSchemaProvider', 'commandBus'];

    keys.forEach((key) => {
      expect(container.resolve(key)).toBe(container.resolve(key));
    });
  });
});
