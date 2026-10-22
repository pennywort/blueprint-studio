import { z } from 'zod';
import { DEFAULT_ELEMENT_KIND_RULES, type ElementKindRules } from './element-kinds';
import {
  DEFAULT_CONNECTION_MATRIX,
  type ConnectionReach,
  type ConnectionSourceRole,
} from './connection-matrix';
import { DEFAULT_LAYER_CAPACITY, type LayerCapacity, type LayerCapacityTable } from './layer-capacity';
import {
  DEFAULT_ELEMENT_COUNT_LIMITS,
  DEFAULT_RULE_SEVERITY,
  type ElementCountLimits,
  type RuleSeverity,
} from './rule-policy';

// Правила редактора одним значением (R-CFG-9, R-ADM, [owner 2026-10-22]):
// все таблицы домена — реестр видов, матрица связей, ёмкость уровней,
// лимиты и строгость — собраны в EditorRules. Значение приходит из настроек
// редактора (умолчания ← администратор) и передаётся явно: инвариантам
// (validateGraph), командам (CommandContext) и UI (useEditorRules). Модульных
// синглтонов нет — смена настроек на лету меняет правила для всех читателей
// сразу, ядро проверок при этом не правится.

export type EditorRules = {
  /** Строгость правил по id нарушения (rule-policy). */
  readonly severity: Readonly<Record<string, RuleSeverity>>;
  /** Сколько элементов вида может лежать в блоке данного вида (rule-policy). */
  readonly elementCountLimits: ElementCountLimits;
  /** Ёмкость уровней слоёного графа (layer-capacity). */
  readonly layerCapacity: LayerCapacityTable;
  /** Отличия поведения видов элементов от обычного элемента (element-kinds). */
  readonly elementKinds: Readonly<Record<string, ElementKindRules>>;
  /** Кто, откуда и куда может строить связи (connection-matrix). */
  readonly connections: Readonly<Record<ConnectionSourceRole, ConnectionReach>>;
};

// Значения = сегодняшнее поведение (таблицы модулей-владельцев).
export const DEFAULT_EDITOR_RULES: EditorRules = {
  severity: DEFAULT_RULE_SEVERITY,
  elementCountLimits: DEFAULT_ELEMENT_COUNT_LIMITS,
  layerCapacity: DEFAULT_LAYER_CAPACITY,
  elementKinds: DEFAULT_ELEMENT_KIND_RULES,
  connections: DEFAULT_CONNECTION_MATRIX,
};

// zod-схема — проверка переопределений администратора (R-ADM). Поля вида
// элемента с умолчаниями: новая строка `{ "button": { "connectable": false } }`
// дополняется до обычного элемента, как kindRules для вида без строки.
const RuleSeveritySchema = z.enum(['error', 'warning', 'off']);
const LayerCapacitySchema = z.record(z.string().regex(/^\d+$/), z.number().int().positive());
const ContainerKindsSchema = z.array(z.enum(['page', 'formStep']));

const ElementKindRulesSchema = z
  .object({
    family: z.enum(['element', 'comment']).default('element'),
    connectable: z.boolean().default(true),
    logicTarget: z.boolean().default(true),
    inAddMenu: z.boolean().default(true),
    variants: z
      .object({
        prop: z.string().min(1),
        idKey: z.string().min(1),
        labelKey: z.string().min(1),
        defaultProp: z.string().min(1).optional(),
        max: z.number().int().positive().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const ConnectionReachSchema = z
  .object({
    page: ContainerKindsSchema.optional(),
    step: z.array(z.literal('formStep')).optional(),
    element: ContainerKindsSchema.optional(),
  })
  .strict();

export const EditorRulesSchema = z
  .object({
    severity: z.record(z.string(), RuleSeveritySchema),
    // partialRecord: блок без записи — без ограничения (z.record с enum в zod 4 требует все ключи).
    elementCountLimits: z.partialRecord(
      z.enum(['home', 'subScenario', 'formStep', 'form']),
      z.record(z.string(), z.number().int().nonnegative()),
    ),
    layerCapacity: z
      .object({
        pages: LayerCapacitySchema,
        formSteps: LayerCapacitySchema,
        stepElements: LayerCapacitySchema,
      })
      .strict(),
    elementKinds: z.record(z.string(), ElementKindRulesSchema),
    connections: z
      .object({
        element: ConnectionReachSchema,
        option: ConnectionReachSchema,
        logicOption: ConnectionReachSchema,
      })
      .strict(),
  })
  .strict();

/** Сырое значение → правила; бросает Error с путём неверного поля. */
export function parseEditorRules(raw: unknown): EditorRules {
  const result = EditorRulesSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(z.prettifyError(result.error));
  }
  const parsed = result.data;
  // Ключи уровней в JSON — строки; LayerCapacity индексируется числом.
  const capacity = (table: Record<string, number>): LayerCapacity => table;
  return {
    ...parsed,
    layerCapacity: {
      pages: capacity(parsed.layerCapacity.pages),
      formSteps: capacity(parsed.layerCapacity.formSteps),
      stepElements: capacity(parsed.layerCapacity.stepElements),
    },
  };
}
