import { TextField, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import type {
  ElementAttribute,
  ElementAttributeType,
  ElementSchema,
} from '@application/ports/element-schema-provider';
import type { ElementPropsPatch } from '@application/commands/update-element-props';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { resolvePropertyEditor } from './property-editor-registry';
import './builtin-property-editors';
import { useBufferedProps } from './use-buffered-props';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  sectionTitle: {
    marginTop: theme.spacing(1),
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
  },
}));

export type AttributesPanelProps = {
  /** Выделенный элемент (любой вид, ADR-17) — источник значений полей. */
  component: CanvasElement;
  /** Описание элемента из IElementSchemaProvider; null — вида нет в политике редактора. */
  schema: ElementSchema | null;
  /**
   * Изменение полей → UpdateElementProps (undo/redo из коробки): через
   * буфер панели — одна команда на паузу ввода/blur (R2).
   */
  onUpdateProps: (elementId: CanvasElement['id'], patch: ElementPropsPatch) => void;
};

// Schema-driven панель атрибутов (T-041, этап 3 docs/schemas/PLAN.md): в панели
// только атрибуты элемента по схеме + политике редактора — состав, порядок,
// подписи, секции и редакторы из описания элемента; ничего сверх них
// [owner 2026-10-19]. Значения — props элемента по ключу атрибута.
export function AttributesPanel({ component, schema, onUpdateProps }: AttributesPanelProps) {
  const classes = useStyles();
  // Буфер ввода (R2): поля показывают черновик поверх значений графа.
  const buffer = useBufferedProps<CanvasElement['id']>(component.id, onUpdateProps);
  const props = { ...component.props, ...buffer.draft?.props };

  // Атрибут виден, если выполнено его условие видимости (политика).
  const attributes = (schema?.attributes ?? []).filter(
    (attribute) =>
      !attribute.visibleWhen || props[attribute.visibleWhen.key] === attribute.visibleWhen.equals,
  );

  // Группировка по секциям: поля без секции — первыми, далее — каждая
  // именованная секция один раз (порядок — первое появление в политике),
  // поля внутри сохраняют порядок политики.
  const groups: { section: string | null; attributes: ElementAttribute[] }[] = [];
  const groupIndex = new Map<string | null, number>();
  for (const attribute of attributes) {
    const section = attribute.section ?? null;
    const existing = groupIndex.get(section);
    if (existing !== undefined) {
      groups[existing]!.attributes.push(attribute);
    } else {
      groupIndex.set(section, groups.length);
      groups.push({ section, attributes: [attribute] });
    }
  }

  return (
    <div className={classes.panel} data-testid="attributes-panel" onBlur={buffer.flush}>
      <div>
        <Typography variant="h6">{schema?.label ?? component.kind}</Typography>
        <Typography variant="body2" color="textSecondary">
          {schema
            ? `${schema.category}${schema.description ? ` · ${schema.description}` : ''}`
            : 'Элемента нет в политике редактора — атрибуты не редактируются'}
        </Typography>
      </div>

      {groups.map((group) => (
        <div key={group.section ?? ''} className={classes.field}>
          {group.section !== null ? (
            <Typography className={classes.sectionTitle} variant="subtitle2" data-testid="panel-section">
              {group.section}
            </Typography>
          ) : null}
          {group.attributes.map((attribute) => {
            const value = props[attribute.key];
            const Editor = resolvePropertyEditor(attribute.type);
            // Значение иной ветви схемы (например, объект в «строка | объект»)
            // или без редактора — read-only сводка: данные не портятся.
            if (!Editor || (value !== undefined && !isValueCompatible(attribute.type, value))) {
              return (
                <TextField
                  key={attribute.key}
                  fullWidth
                  size="small"
                  variant="outlined"
                  disabled
                  label={attribute.label}
                  value={formatReadonlyValue(value)}
                />
              );
            }
            return (
              <div key={attribute.key} className={classes.field}>
                <Editor
                  value={value}
                  attribute={attribute}
                  onChange={(next) => buffer.change({ props: { [attribute.key]: next } })}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Совместимость значения props с типом атрибута (тип — из схемы элемента).
function isValueCompatible(type: ElementAttributeType, value: unknown): boolean {
  switch (type) {
    case 'text':
    case 'radio':
    case 'select':
      return typeof value === 'string';
    case 'bool':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'stringList':
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    case 'optionList':
      return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null);
  }
}

// Резервный вывод значения без подходящего редактора: краткая сводка вместо «молчания».
function formatReadonlyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? 'Пусто' : `${value.length} элемент(ов)`;
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
