import {
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Add, Delete } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { registerPropertyEditor, type PropertyEditorProps } from './property-editor-registry';

// Встроенные редакторы свойств (T-040): text → TextField, stringList →
// многострочное поле (по строке на элемент), bool → Switch, number →
// числовое поле, radio → RadioGroup, select → Select, optionList — список
// вариантов. Редакторы не знают о kind'ах элементов — только об описании
// атрибута (схема + политика редактора, этап 3 docs/schemas/PLAN.md).

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
}));

function TextPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      required={attribute.required}
      label={attribute.label}
      placeholder={attribute.placeholder}
      helperText={attribute.helperText}
      multiline={attribute.multiline}
      rows={attribute.multiline ? 3 : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      type="number"
      required={attribute.required}
      label={attribute.label}
      placeholder={attribute.placeholder}
      helperText={attribute.helperText}
      value={typeof value === 'number' ? String(value) : ''}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === '' ? undefined : Number(next));
      }}
    />
  );
}

function MultilinePropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const lines = Array.isArray(value) ? value.map((line) => String(line)).join('\n') : '';
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      multiline
      rows={3}
      required={attribute.required}
      label={attribute.label}
      placeholder={attribute.placeholder}
      helperText={attribute.helperText}
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
  );
}

function BoolPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <FormControlLabel
      control={<Switch checked={value === true} onChange={(event) => onChange(event.target.checked)} />}
      label={attribute.label}
    />
  );
}

function RadioPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <FormControl component="fieldset" fullWidth>
      <InputLabel shrink>{attribute.label}</InputLabel>
      <RadioGroup
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {(attribute.options ?? []).map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

// Пустое значение — «не задано» (prop снимается): берётся значение фреймворка.
function SelectPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  return (
    <FormControl fullWidth size="small" variant="outlined" required={attribute.required}>
      <InputLabel shrink>{attribute.label}</InputLabel>
      <Select
        value={typeof value === 'string' ? value : ''}
        label={attribute.label}
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
    </FormControl>
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
    <div className={classes.list} data-testid="option-list-editor">
      <Typography variant="subtitle2">{attribute.label}</Typography>
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
            <Delete fontSize="small" />
          </IconButton>
        </div>
      ))}
      <div>
        <Button
          size="small"
          startIcon={<Add />}
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
      {attribute.helperText ? (
        <Typography variant="caption" color="textSecondary">
          {attribute.helperText}
        </Typography>
      ) : null}
    </div>
  );
}

registerPropertyEditor('text', TextPropertyEditor);
registerPropertyEditor('stringList', MultilinePropertyEditor);
registerPropertyEditor('bool', BoolPropertyEditor);
registerPropertyEditor('number', NumberPropertyEditor);
registerPropertyEditor('radio', RadioPropertyEditor);
registerPropertyEditor('select', SelectPropertyEditor);
registerPropertyEditor('optionList', OptionListPropertyEditor);
