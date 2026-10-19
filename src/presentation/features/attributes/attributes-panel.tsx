import {
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Delete } from '@blueprint-vendor/flamingo-icons';
import type {
  ElementAttribute,
  ElementAttributeType,
  ElementSchema,
} from '@application/ports/element-schema-provider';
import type { ElementPropsPatch } from '@application/commands/update-element-props';
import type { CanvasElement } from '@domain/model/canvas-element';
import { canBeLogicSource, isCommentElement } from '@domain/element-kinds';
import type { LogicRuleId } from '@domain/model/ids';
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
  /** Описание элемента из IElementSchemaProvider; null — вида нет в политике редактора. */
  schema: ElementSchema | null;
  /**
   * Изменение полей → UpdateElementProps (undo/redo из коробки): через
   * буфер панели — одна команда на паузу ввода/blur (R2).
   */
  onUpdateProps: (elementId: CanvasElement['id'], patch: ElementPropsPatch) => void;
  /** Только для источника логики: свитч «Сложная логика» (T-067). */
  onToggleComplexLogic?: () => void;
  /** Правила видимости, где элемент — цель (T-067). */
  incomingRules: IncomingRuleView[];
  onRemoveRule: (ruleId: LogicRuleId) => void;
};

// Schema-driven панель атрибутов (T-041, этап 3 docs/schemas/PLAN.md): состав
// полей, порядок, подписи, секции и редакторы — из описания элемента (схема
// фреймворка + политика редактора), ничего не захардкожено под конкретный
// элемент. Значения — props элемента по ключу атрибута. Поле «Комментарий
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
  const props = { ...component.props, ...buffer.draft?.props };
  const comment = buffer.draft?.comment ?? component.comment;

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

      {canBeLogicSource(component) && onToggleComplexLogic ? (
        <div className={classes.field} data-testid="complex-logic-section">
          <FormControlLabel
            control={<Switch checked={component.hasComplexLogic === true} onChange={onToggleComplexLogic} />}
            label="Сложная логика"
          />
          <Typography variant="caption" color="textSecondary">
            При включении у каждого варианта появится точка соединения для правил видимости
          </Typography>
        </div>
      ) : null}

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

      {incomingRules.length > 0 ? (
        <div className={classes.field} data-testid="visibility-section">
          <Typography className={classes.sectionTitle} variant="subtitle2">
            Видимость
          </Typography>
          {incomingRules.map((rule) => (
            <div className={classes.ruleRow} key={rule.ruleId}>
              <Typography variant="body2">
                {rule.sourceLabel}
                {rule.optionLabel ? ` · вариант «${rule.optionLabel}»` : ''}
              </Typography>
              <IconButton size="small" aria-label="Удалить правило" onClick={() => onRemoveRule(rule.ruleId)}>
                <Delete fontSize="small" />
              </IconButton>
            </div>
          ))}
          <Typography variant="caption" color="textSecondary">
            Элемент показывается, когда выбран указанный вариант (неявное ИЛИ между правилами)
          </Typography>
        </div>
      ) : null}

      {/* Комментарий-часть элемента (US-05); у комментария-элемента его нет. */}
      {!isCommentElement(component) ? (
        <>
          <Divider />
          <div className={classes.field}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              multiline
              rows={2}
              label="Комментарий для разработки"
              value={comment ?? ''}
              onChange={(event) => buffer.change({ comment: event.target.value })}
            />
          </div>
        </>
      ) : null}
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
