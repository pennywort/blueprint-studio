import {
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { editorIcons } from '@presentation/icons/editor-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { AttributeField } from './attribute-field';
import { IconPropertyEditor } from './icon-property-editor';
import { registerPropertyEditor, type PropertyEditorProps } from './property-editor-registry';

// Встроенные редакторы свойств (T-040): text → TextField, stringList →
// многострочное поле (по строке на элемент), bool → Switch, number →
// числовое поле, radio → RadioGroup, select → Select, chips/multiChips —
// чипы (один или несколько вариантов), optionList — список
// вариантов, icon — поиск + сетка иконок. Редакторы не знают о kind'ах
// элементов — только об описании атрибута (схема + политика редактора, этап 3
// docs/schemas/PLAN.md). Подпись и подсказка — общий каркас AttributeField.

const useStyles = makeStyles<EditorTheme>((theme) => ({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  // Переключатель по макету: подпись слева, switch справа.
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    minHeight: 40,
  },
  switchText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  secondaryText: {
    color: theme.palette.text.secondary,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
}));

function TextPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <AttributeField attribute={attribute}>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        placeholder={attribute.placeholder}
        multiline={attribute.multiline}
        rows={attribute.multiline ? 3 : undefined}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </AttributeField>
  );
}

function NumberPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <AttributeField attribute={attribute}>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        type="number"
        placeholder={attribute.placeholder}
        value={typeof value === 'number' ? String(value) : ''}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === '' ? undefined : Number(next));
        }}
      />
    </AttributeField>
  );
}

function MultilinePropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const lines = Array.isArray(value) ? value.map((line) => String(line)).join('\n') : '';
  return (
    <AttributeField attribute={attribute}>
      <TextField
        fullWidth
        size="small"
        variant="outlined"
        multiline
        rows={3}
        placeholder={attribute.placeholder}
        value={lines}
        onChange={(event) =>
          onChange(
            event.target.value
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0),
          )
        }
      />
    </AttributeField>
  );
}

function BoolPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const classes = useStyles();
  return (
    <div className={classes.switchRow}>
      <div className={classes.switchText}>
        <Typography variant="body2">{attribute.label}</Typography>
        {attribute.helperText ? (
          <Typography variant="caption" className={classes.secondaryText}>
            {attribute.helperText}
          </Typography>
        ) : null}
      </div>
      <Switch
        checked={value === true}
        inputProps={{ 'aria-label': attribute.label }}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}

function RadioPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <AttributeField attribute={attribute}>
      <RadioGroup
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {(attribute.options ?? []).map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio size="small" />}
            label={<Typography variant="body2">{option.label}</Typography>}
          />
        ))}
      </RadioGroup>
    </AttributeField>
  );
}

// Пустое значение — «не задано» (prop снимается): берётся значение фреймворка.
function SelectPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <AttributeField attribute={attribute}>
      <Select
        fullWidth
        variant="outlined"
        margin="dense"
        value={typeof value === 'string' ? value : ''}
        displayEmpty
        onChange={(event) => onChange(event.target.value === '' ? undefined : (event.target.value as string))}
      >
        {attribute.required ? null : (
          <MenuItem value="">
            <em>Не задано</em>
          </MenuItem>
        )}
        {(attribute.options ?? []).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </AttributeField>
  );
}

// Выбор чипами [owner 2026-10-22]: выбранный — заливка цветом темы, остальные —
// контур. Один из вариантов (chips): повторный клик снимает выбор у
// необязательного атрибута. Несколько (multiChips): клик переключает вариант,
// порядок значений — порядок вариантов; пустой выбор снимает значение.
function ChipsPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const classes = useStyles();
  const multiple = attribute.type === 'multiChips';
  const selected = new Set<unknown>(multiple ? (Array.isArray(value) ? value : []) : [value]);
  const options = attribute.options ?? [];
  const toggle = (option: string) => {
    if (!multiple) {
      onChange(selected.has(option) && !attribute.required ? undefined : option);
      return;
    }
    const next = options
      .map((item) => item.value)
      .filter((item) => (item === option ? !selected.has(item) : selected.has(item)));
    onChange(next.length > 0 ? next : undefined);
  };
  return (
    <AttributeField attribute={attribute}>
      <div className={classes.chips} data-testid="chips-editor">
        {options.map((option) => (
          <Chip
            key={option.value}
            size="small"
            clickable
            label={option.label}
            color={selected.has(option.value) ? 'primary' : 'default'}
            variant={selected.has(option.value) ? 'default' : 'outlined'}
            aria-pressed={selected.has(option.value)}
            onClick={() => toggle(option.value)}
          />
        ))}
      </div>
    </AttributeField>
  );
}

type OptionItem = Record<string, unknown>;

const asItems = (value: unknown): OptionItem[] =>
  Array.isArray(value)
    ? value.filter((item): item is OptionItem => typeof item === 'object' && item !== null)
    : [];

// Редактор вариантов выбора (optionList): строка на вариант — название и
// удаление; «Добавить вариант» создаёт вариант со стабильным id (на него
// ссылаются правила «Сложной логики», поэтому id не редактируется). Ключи id
// и подписи и обязательные поля нового варианта — из описания атрибута.
function OptionListPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const classes = useStyles();
  const shape = attribute.item;
  if (!shape) {
    return null;
  }
  const items = asItems(value);
  const text = (item: OptionItem, key: string) =>
    typeof item[key] === 'string' ? (item[key] as string) : '';
  const update = (index: number, patch: OptionItem) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <AttributeField attribute={attribute} variant="heading">
      <div className={classes.list} data-testid="option-list-editor">
        {items.map((item, index) => (
          <div key={text(item, shape.idKey) || index} className={classes.row}>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              placeholder={`Вариант ${index + 1}`}
              value={text(item, shape.labelKey)}
              onChange={(event) => update(index, { [shape.labelKey]: event.target.value })}
            />
            <IconButton
              size="small"
              aria-label="Удалить вариант"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <editorIcons.delete fontSize="small" />
            </IconButton>
          </div>
        ))}
        <Button
          size="small"
          className={classes.addButton}
          startIcon={<editorIcons.add />}
          onClick={() =>
            onChange([
              ...items,
              {
                ...shape.template,
                [shape.idKey]: `option-${crypto.randomUUID().slice(0, 8)}`,
                [shape.labelKey]: `Вариант ${items.length + 1}`,
              },
            ])
          }
        >
          Добавить вариант
        </Button>
      </div>
    </AttributeField>
  );
}

registerPropertyEditor('text', TextPropertyEditor);
registerPropertyEditor('stringList', MultilinePropertyEditor);
registerPropertyEditor('bool', BoolPropertyEditor);
registerPropertyEditor('number', NumberPropertyEditor);
registerPropertyEditor('radio', RadioPropertyEditor);
registerPropertyEditor('select', SelectPropertyEditor);
registerPropertyEditor('chips', ChipsPropertyEditor);
registerPropertyEditor('multiChips', ChipsPropertyEditor);
registerPropertyEditor('optionList', OptionListPropertyEditor);
registerPropertyEditor('icon', IconPropertyEditor);
