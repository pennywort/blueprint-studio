import {
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Delete } from '@blueprint-vendor/flamingo-icons';
import type { ElementAttributeType, ElementSchema } from '@application/ports/element-schema-provider';
import type { ElementPropsPatch } from '@application/commands/update-element-props';
import { hasElementField, type CanvasElement } from '@domain/model/canvas-element';
import type { LogicRuleId } from '@domain/model/ids';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { ELEMENT_KIND_LABELS } from '@presentation/features/canvas/graph-flow-adapter';
import { getElementAttributeMeta, type AttributeMeta } from './element-attribute-meta';
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
  ruleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
}));

// Правило видимости, приходящее на выделенный элемент (цель): для секции
// «Видимость» инспектора (T-067).
export type IncomingRuleView = {
  ruleId: LogicRuleId;
  sourceLabel: string;
  optionLabel: string | null;
};

export type AttributesPanelProps = {
  /** Выделенный элемент (любой вид, ADR-17) — источник значений полей. */
  component: CanvasElement;
  /** Схема элемента из IElementSchemaProvider (ADR-07); null — схемы нет. */
  schema: ElementSchema | null;
  /**
   * Изменение полей → UpdateElementProps (undo/redo из коробки): через
   * буфер панели — одна команда на паузу ввода/blur (R2).
   */
  onUpdateProps: (elementId: CanvasElement['id'], patch: ElementPropsPatch) => void;
  /** Только для selectList: свитч «Сложная логика» (T-067). */
  onToggleComplexLogic?: () => void;
  /** Правила видимости, где элемент — цель (T-067). */
  incomingRules: IncomingRuleView[];
  onRemoveRule: (ruleId: LogicRuleId) => void;
};

// Schema-driven панель атрибутов (T-041): состав полей и редакторы определяет
// схема элемента из IElementSchemaProvider + метаинформация проектных схем
// (D4: label, секции, опции enum, условная видимость) — ничего не
// захардкожено под конкретный элемент. Значения читаются из доменного
// компонента по ключу атрибута; атрибуты, которых нет в доменной модели
// (stub-манифест ADR-07 шире/уже модели), не рендерятся. Поле «Комментарий
// для разработки» — универсально (US-05). Секции «Сложная логика» и
// «Видимость» — инспектор T-067.
export function AttributesPanel({
  component,
  schema,
  onUpdateProps,
  onToggleComplexLogic,
  incomingRules,
  onRemoveRule,
}: AttributesPanelProps) {
  const classes = useStyles();
  // Буфер ввода (R2): поля показывают черновик поверх значений графа.
  const buffer = useBufferedProps<CanvasElement['id']>(component.id, onUpdateProps);
  const view = (buffer.draft ? { ...component, ...buffer.draft } : component) as CanvasElement;
  const meta = getElementAttributeMeta(component.kind);
  const title = ELEMENT_KIND_LABELS[component.kind];

  // Поля по схеме: порядок — порядок атрибутов в манифесте; атрибут виден,
  // если ключ есть в доменной модели элемента (в том числе ещё не заданное
  // необязательное поле) и выполнено условие видимости (D4).
  const attributes = (schema?.attributes ?? []).filter((attribute) => {
    if (!hasElementField(component.kind, attribute.key)) {
      return false;
    }
    const rule = meta.attributes[attribute.key]?.visibleWhen;
    return !rule || (view as unknown as Record<string, unknown>)[rule.key] === rule.equals;
  });

  // Группировка по секциям (мета D4): поля без секции — первыми, далее —
  // каждая именованная секция один раз (порядок — первое появление в схеме),
  // поля внутри сохраняют порядок манифеста.
  const groups: { section: string | null; keys: typeof attributes }[] = [];
  const groupIndex = new Map<string | null, number>();
  for (const attribute of attributes) {
    const section = meta.attributes[attribute.key]?.section ?? null;
    const existing = groupIndex.get(section);
    if (existing !== undefined) {
      groups[existing]!.keys.push(attribute);
    } else {
      groupIndex.set(section, groups.length);
      groups.push({ section, keys: [attribute] });
    }
  }

  return (
    <Box className={classes.panel} data-testid="attributes-panel" onBlur={buffer.flush}>
      <Box>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="body2" color="textSecondary">
          {meta.category}
          {meta.description ? ` · ${meta.description}` : ''}
        </Typography>
      </Box>

      {component.kind === 'selectList' && onToggleComplexLogic ? (
        <Box className={classes.field} data-testid="complex-logic-section">
          <FormControlLabel
            control={<Switch checked={component.hasComplexLogic === true} onChange={onToggleComplexLogic} />}
            label="Сложная логика"
          />
          <Typography variant="caption" color="textSecondary">
            При включении у каждого варианта появится точка соединения для правил видимости
          </Typography>
        </Box>
      ) : null}

      {groups.map((group) => (
        <Box key={group.section ?? ''} className={classes.field}>
          {group.section !== null ? (
            <Typography className={classes.sectionTitle} variant="subtitle2" data-testid="panel-section">
              {group.section}
            </Typography>
          ) : null}
          {group.keys.map((attribute) => {
            const attributeMeta: AttributeMeta = meta.attributes[attribute.key] ?? {};
            const value = (view as unknown as Record<string, unknown>)[attribute.key];
            const label = attributeMeta.label ?? attribute.key;
            // Значение должно соответствовать типу атрибута: иначе (stub-
            // манифест ADR-07 шире/уже доменной модели) — read-only сводка,
            // чтобы схема не «молчала» и не портила данные.
            if (value !== undefined && !isValueCompatible(attribute.type, value)) {
              return (
                <TextField
                  key={attribute.key}
                  fullWidth
                  size="small"
                  variant="outlined"
                  disabled
                  label={label}
                  value={formatReadonlyValue(value)}
                />
              );
            }
            const Editor = resolvePropertyEditor(attribute.type);
            return Editor ? (
              <Box key={attribute.key} className={classes.field}>
                <Editor
                  value={value}
                  required={attribute.required}
                  meta={{ label, ...attributeMeta }}
                  onChange={(next) => buffer.change({ [attribute.key]: next } as ElementPropsPatch)}
                />
              </Box>
            ) : (
              <TextField
                key={attribute.key}
                fullWidth
                size="small"
                variant="outlined"
                disabled
                label={label}
                value={formatReadonlyValue(value)}
              />
            );
          })}
        </Box>
      ))}

      {incomingRules.length > 0 ? (
        <Box className={classes.field} data-testid="visibility-section">
          <Typography className={classes.sectionTitle} variant="subtitle2">
            Видимость
          </Typography>
          {incomingRules.map((rule) => (
            <Box className={classes.ruleRow} key={rule.ruleId}>
              <Typography variant="body2">
                {rule.sourceLabel}
                {rule.optionLabel ? ` · вариант «${rule.optionLabel}»` : ''}
              </Typography>
              <IconButton size="small" aria-label="Удалить правило" onClick={() => onRemoveRule(rule.ruleId)}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Typography variant="caption" color="textSecondary">
            Элемент показывается, когда выбран указанный вариант (неявное ИЛИ между правилами)
          </Typography>
        </Box>
      ) : null}

      <Divider />

      <Box className={classes.field}>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          multiline
          rows={2}
          label="Комментарий для разработки"
          value={view.comment ?? ''}
          onChange={(event) => buffer.change({ comment: event.target.value })}
        />
      </Box>
    </Box>
  );
}

// Совместимость значения доменного компонента с типом атрибута схемы.
// Несовместимые комбинации (stub-манифест ADR-07 vs доменная модель:
// options как SelectOption[], links как MarkdownLink[]) выводятся read-only.
function isValueCompatible(type: ElementAttributeType, value: unknown): boolean {
  switch (type) {
    case 'text':
      return typeof value === 'string';
    case 'bool':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number';
    case 'radio':
    case 'select':
      return typeof value === 'string';
    case 'stringList':
      return Array.isArray(value) && value.every((item) => typeof item === 'string');
    case 'optionList':
      return Array.isArray(value) && value.every(isRecordWith('label', 'value'));
    case 'linkList':
      return Array.isArray(value) && value.every(isRecordWith('label', 'url'));
  }
}

function isRecordWith(...keys: string[]) {
  return (item: unknown): boolean =>
    typeof item === 'object' &&
    item !== null &&
    keys.every((key) => typeof (item as Record<string, unknown>)[key] === 'string');
}

// Резервный вывод значения без зарегистрированного редактора (например,
// массив объектов у stringList-атрибута): краткая сводка вместо «молчания».
function formatReadonlyValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? 'Пусто' : `${value.length} элемент(ов)`;
  }
  return String(value);
}
