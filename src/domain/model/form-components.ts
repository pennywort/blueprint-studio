import { z } from 'zod';
import { FormComponentIdSchema, FormStepIdSchema, ScenarioIdSchema } from './ids';

// 12 форм-компонентов по спецификации 001-foundation, раздел 5.4.
// Discriminated union по `kind`. Общие поля: id, kind, comment?, complexLogic?.

// Доменные константы лимитов платформы (спека 5.4, attachment).
export const ATTACHMENT_MAX_FILE_BYTES = 3 * 1024 * 1024; // 3 МБ на файл
export const ATTACHMENT_MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 МБ суммарно
export const RADIO_MAX_OPTIONS = 5; // радио-группа — максимум 5 вариантов

// Маршрутизация задаётся в технических характеристиках (БТ, раздел 4.1),
// поэтому хранится как метаданные компонента, а не в визуальной форме.
export const RoutingRuleSchema = z.object({
  // Компонент участвует в маршрутизации: его значение определяет переход.
  targetStepId: FormStepIdSchema.optional(),
  targetScenarioId: ScenarioIdSchema.optional(),
});
export type RoutingRule = z.infer<typeof RoutingRuleSchema>;

const baseFields = {
  id: FormComponentIdSchema,
  comment: z.string().optional(), // комментарий для разработчика (US-05)
  complexLogic: z.string().optional(), // флаг «сложная логика» (US-04)
  routing: RoutingRuleSchema.optional(), // компонент завязан на маршрутизацию
  hasDynamicContent: z.boolean().optional(), // компонент с динамическим контентом
};

export const MarkdownLinkSchema = z.object({
  label: z.string(),
  url: z.string(),
});
export type MarkdownLink = z.infer<typeof MarkdownLinkSchema>;

export const TextFieldSchema = z.object({
  ...baseFields,
  kind: z.literal('textField'),
  label: z.string(),
  required: z.boolean(),
  multiline: z.boolean(),
  maxLength: z.number().int().positive().optional(),
  placeholder: z.string().optional(),
  caption: z.string().optional(),
  tooltip: z.string().optional(),
});

export const InfoBlockSchema = z.object({
  ...baseFields,
  kind: z.literal('infoBlock'),
  text: z.string(),
  links: z.array(MarkdownLinkSchema),
});

export const DatePeriodSchema = z.object({
  ...baseFields,
  kind: z.literal('datePeriod'),
  label: z.string(),
  required: z.boolean(),
  withTime: z.boolean(),
  restrictions: z.object({
    noPast: z.boolean().optional(),
    noFuture: z.boolean().optional(),
  }),
  customLogic: z.string().optional(),
});

export const AttachmentSchema = z.object({
  ...baseFields,
  kind: z.literal('attachment'),
  label: z.string(),
  required: z.boolean(),
  allowedTypes: z.array(z.string()),
});

export const CheckboxSchema = z.object({
  ...baseFields,
  kind: z.literal('checkbox'),
  label: z.string(),
  required: z.boolean(),
});

export const ConfigurationItemPickerSchema = z.object({
  ...baseFields,
  kind: z.literal('configurationItemPicker'),
  label: z.string(),
  required: z.boolean(),
  multiSelect: z.boolean(),
  ciTypes: z.array(z.string()),
  disabled: z.boolean(),
  tooltip: z.string().optional(),
  emptyResult: z.string().optional(),
  helperText: z.string().optional(),
  disableCloseOnSelect: z.boolean().optional(),
});

export const EmployeeSearchSchema = z.object({
  ...baseFields,
  kind: z.literal('employeeSearch'),
  label: z.string(),
  required: z.boolean(),
  searchType: z.enum(['colleagues', 'all']),
});

export const SelectOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  isDefault: z.boolean().optional(),
});
export type SelectOption = z.infer<typeof SelectOptionSchema>;

export const SelectListSchema = z.object({
  ...baseFields,
  kind: z.literal('selectList'),
  label: z.string(),
  required: z.boolean(),
  displayType: z.enum(['radio', 'dropdown', 'list']),
  multiSelect: z.boolean(),
  options: z.array(SelectOptionSchema),
  search: z.boolean().optional(),
});

export const TypographySchema = z.object({
  ...baseFields,
  kind: z.literal('typography'),
  label: z.string(),
  displayType: z.literal('heading'),
});

export const ButtonSchema = z.object({
  ...baseFields,
  kind: z.literal('button'),
  label: z.string(),
  displayType: z.enum(['text', 'secondary']),
  position: z.enum(['inline', 'standalone']),
});

export const AddressPickerSchema = z.object({
  ...baseFields,
  kind: z.literal('addressPicker'),
  label: z.string(),
  required: z.boolean(),
  displayParts: z.array(z.enum(['floor', 'room', 'zone', 'workplace'])),
});

export const EmployeeLoginFieldSchema = z.object({
  ...baseFields,
  kind: z.literal('employeeLoginField'),
  label: z.string(),
  required: z.boolean(),
  isHidden: z.boolean().optional(),
});

export const FormComponentSchema = z.discriminatedUnion('kind', [
  TextFieldSchema,
  InfoBlockSchema,
  DatePeriodSchema,
  AttachmentSchema,
  CheckboxSchema,
  ConfigurationItemPickerSchema,
  EmployeeSearchSchema,
  SelectListSchema,
  TypographySchema,
  ButtonSchema,
  AddressPickerSchema,
  EmployeeLoginFieldSchema,
]);

export type TextField = z.infer<typeof TextFieldSchema>;
export type InfoBlock = z.infer<typeof InfoBlockSchema>;
export type DatePeriod = z.infer<typeof DatePeriodSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Checkbox = z.infer<typeof CheckboxSchema>;
export type ConfigurationItemPicker = z.infer<typeof ConfigurationItemPickerSchema>;
export type EmployeeSearch = z.infer<typeof EmployeeSearchSchema>;
export type SelectList = z.infer<typeof SelectListSchema>;
export type Typography = z.infer<typeof TypographySchema>;
export type Button = z.infer<typeof ButtonSchema>;
export type AddressPicker = z.infer<typeof AddressPickerSchema>;
export type EmployeeLoginField = z.infer<typeof EmployeeLoginFieldSchema>;

export type FormComponent = z.infer<typeof FormComponentSchema>;
export type FormComponentKind = FormComponent['kind'];
