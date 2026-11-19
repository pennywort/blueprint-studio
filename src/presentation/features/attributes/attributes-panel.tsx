import { Fragment, type ReactNode } from 'react';
import { TextField, Typography, makeStyles } from '@material-ui/core';
import type { ElementAttribute, ElementSchema } from '@application/ports/element-schema-provider';
import type { ElementPropsPatch } from '@application/commands/update-element-props';
import type { CanvasElement } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { AttributeField } from './attribute-field';
import { resolvePropertyEditor } from './property-editor-registry';
import './builtin-property-editors';
import { useBufferedProps } from './use-buffered-props';
import { ToggleGate } from './toggle-gate';
import { activeLock } from '@domain/attribute-locks';
import { patchWithLocks } from './attribute-locks';
import { LockNotice } from './lock-notice';
import './choice-list-editors';

// Вёрстка по макетам docs/design-mockups/настройка-атрибутов-*: шапка с
// разделителем, поля с подписью над ними (AttributeField), секции —
// заголовком; отступы задаёт панель, а не редакторы.
const useStyles = makeStyles<EditorTheme>((theme) => ({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  title: {
    fontWeight: 600,
  },
  subtitle: {
    color: theme.palette.text.secondary,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  // В секции переключатели идут плотнее: строка switch уже со своей высотой.
  section: {
    gap: theme.spacing(1),
  },
  sectionTitle: {
    fontWeight: 600,
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
// [owner 2026-10-19]. Значения — props элемента или надстройки ext (store
// атрибута) по ключу атрибута.
export function AttributesPanel({ component, schema, onUpdateProps }: AttributesPanelProps) {
  const classes = useStyles();
  // Буфер ввода (R2): поля показывают черновик поверх значений графа.
  const buffer = useBufferedProps<CanvasElement['id']>(component.id, onUpdateProps);
  // Значения по ключу атрибута: props элемента и надстройки ext — ключи не
  // пересекаются (проверка сборки схем), поэтому одна таблица на оба хранилища.
  const values = {
    ...component.props,
    ...component.ext,
    ...buffer.draft?.props,
    ...buffer.draft?.ext,
  };

  const all = schema?.attributes ?? [];
  // Поля варианта переключателей (switches) рисуются под его switch, а не в потоке.
  const switchKeys = new Set(all.filter((item) => item.type === 'switches').map((item) => item.key));
  const nestedIn = (attribute: ElementAttribute) =>
    attribute.visibleWhen !== undefined && switchKeys.has(attribute.visibleWhen.key);
  const isVisible = (attribute: ElementAttribute) =>
    !attribute.visibleWhen || values[attribute.visibleWhen.key] === attribute.visibleWhen.equals;
  // Атрибут виден, если выполнено его условие видимости (политика).
  const attributes = all.filter((attribute) => !nestedIn(attribute) && isVisible(attribute));

  // Группировка по секциям — подряд идущие поля одной секции [owner 2026-11-19]:
  // порядок панели — порядок политики (общий комментарий — внизу, как в
  // макете); секция — заголовок над своей группой («Тип группы», «Настройки»).
  const groups: { section: string | null; attributes: ElementAttribute[] }[] = [];
  for (const attribute of attributes) {
    const section = attribute.section ?? null;
    const last = groups.at(-1);
    if (last && last.section === section) {
      last.attributes.push(attribute);
    } else {
      groups.push({ section, attributes: [attribute] });
    }
  }

  const renderAttribute = (attribute: ElementAttribute): ReactNode => {
    const id = `${attribute.key}#${attribute.view ?? ''}`;
    const lock = activeLock(attribute, values);
    const value = lock ? lock.value : values[attribute.key];
    const Editor = resolvePropertyEditor(attribute.type);
    // Значение иной ветви схемы (например, объект в «строка | объект»)
    // или без редактора — read-only сводка: данные не портятся.
    if (!Editor || (value !== undefined && !isValueCompatible(attribute, value))) {
      return (
        <AttributeField key={id} attribute={attribute}>
          <TextField fullWidth size="small" variant="outlined" disabled value={formatReadonlyValue(value)} />
        </AttributeField>
      );
    }
    const onChange = (next: unknown) => buffer.change(patchWithLocks(all, values, attribute, next));
    // Поля варианта switches (visibleWhen на этот атрибут) — под его переключателем.
    const renderOption = (option: string) => {
      const children = all.filter(
        (item) => item.visibleWhen?.key === attribute.key && item.visibleWhen.equals === option,
      );
      return children.length > 0 ? children.map(renderAttribute) : null;
    };
    const editor = (
      <Editor
        value={value}
        attribute={attribute.toggle ? { ...attribute, label: '' } : attribute}
        onChange={onChange}
        disabled={lock !== undefined}
        renderOption={renderOption}
      />
    );
    if (!attribute.toggle) {
      return (
        <Fragment key={id}>
          {/* Пояснение фиксации — текст правила lockedWhen политики [owner 2026-11-19]. */}
          {lock?.notice ? <LockNotice text={lock.notice} /> : null}
          {editor}
        </Fragment>
      );
    }
    // Поле под переключателем (toggle политики): подпись — у переключателя;
    // ключ с id элемента сбрасывает «раскрыто» при смене выделения.
    return (
      <ToggleGate
        key={`${component.id}:${id}`}
        attribute={attribute}
        hasValue={value !== undefined && value !== null && value !== ''}
        onClear={() => onChange(undefined)}
      >
        {editor}
      </ToggleGate>
    );
  };

  return (
    <div className={classes.panel} data-testid="attributes-panel" onBlur={buffer.flush}>
      <div className={classes.header}>
        <Typography variant="h6" className={classes.title}>
          {schema?.label ?? component.kind}
        </Typography>
        <Typography variant="caption" className={classes.subtitle}>
          {schema
            ? `${schema.category}${schema.description ? ` · ${schema.description}` : ''}`
            : 'Элемента нет в политике редактора — атрибуты не редактируются'}
        </Typography>
      </div>

      {groups.map((group, index) => (
        <div
          key={`${index}:${group.section ?? ''}`}
          className={`${classes.group} ${group.section !== null ? classes.section : ''}`}
        >
          {group.section !== null ? (
            <Typography className={classes.sectionTitle} variant="subtitle1" data-testid="panel-section">
              {group.section}
            </Typography>
          ) : null}
          {group.attributes.map((attribute) => renderAttribute(attribute))}
        </div>
      ))}
    </div>
  );
}

// Совместимость значения props с типом атрибута (тип — из схемы элемента).
// Множественный выбор (multiple) — массив строк при любом поле ввода; строка —
// значение до включения multiple, редактор покажет её выбранной.
function isValueCompatible({ type, multiple }: ElementAttribute, value: unknown): boolean {
  if (multiple) {
    return (
      typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'))
    );
  }
  switch (type) {
    case 'text':
    case 'radio':
    case 'select':
    case 'chips':
    case 'switches':
    case 'icon':
      return typeof value === 'string';
    case 'bool':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'stringList':
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    case 'optionList':
    case 'optionFile':
    case 'optionText':
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
