import { describe, expect, it } from 'vitest';
import { SchemaNotFoundError } from '@application/ports/element-schema-provider';
import { ManifestSchemaProvider } from './manifest-schema-provider';

describe('ManifestSchemaProvider (stub-адаптер IElementSchemaProvider)', () => {
  it('загружает манифест из репозитория: 12 записей', () => {
    const provider = new ManifestSchemaProvider();
    expect(provider.listSchemas()).toHaveLength(12);
  });

  it('возвращает схему по известному kind', () => {
    const provider = new ManifestSchemaProvider();
    const schema = provider.getSchema('textField');
    expect(schema.kind).toBe('textField');
    expect(schema.attributes.length).toBeGreaterThan(0);
  });

  it('бросает SchemaNotFoundError на неизвестный kind', () => {
    const provider = new ManifestSchemaProvider({
      rawManifest: [{ kind: 'textField', version: 1, attributes: [] }],
    });
    expect(() => provider.getSchema('checkbox')).toThrow(SchemaNotFoundError);
  });

  it('контрактный тест: сломанный манифест — понятная ошибка валидации при старте', () => {
    expect(
      () => new ManifestSchemaProvider({ rawManifest: [{ kind: 'textField' }] }),
    ).toThrowError(/version|invalid/i);
  });

  it('контрактный тест: неизвестный тип атрибута — ошибка валидации', () => {
    const broken = [
      { kind: 'textField', version: 1, attributes: [{ key: 'label', type: 'magic', required: true }] },
    ];
    expect(() => new ManifestSchemaProvider({ rawManifest: broken })).toThrow();
  });
});
