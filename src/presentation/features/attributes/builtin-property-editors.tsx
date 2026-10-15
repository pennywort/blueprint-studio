import {
  Box,
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
  Tooltip,
  Typography,
} from '@blueprint-vendor/flamingo-core';
import { Add, Delete } from '@blueprint-vendor/flamingo-icons';
import { registerPropertyEditor, type PropertyEditorProps } from './property-editor-registry';

// Встроенные редакторы свойств (T-040): text → TextField, stringList →
// многострочное поле (по строке на элемент), bool → Switch, number →
// числовое поле, radio → RadioGroup, select → Select. Редакторы не знают о
// kind'ах элементов — только о типе атрибута и мете (опции enum — из D4).

function TextPropertyEditor({ value, onChange, meta, required }: PropertyEditorProps) {
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      required={required}
      label={meta.label}
      placeholder={meta.placeholder}
      helperText={meta.helperText}
      multiline={meta.multiline}
      rows={meta.multiline ? 3 : undefined}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function NumberPropertyEditor({ value, onChange, meta, required }: PropertyEditorProps) {
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      type="number"
      required={required}
      label={meta.label}
      placeholder={meta.placeholder}
      helperText={meta.helperText}
      value={typeof value === 'number' ? String(value) : ''}
      onChange={(event) => {
        const next = event.target.value;
        onChange(next === '' ? undefined : Number(next));
      }}
    />
  );
}

function MultilinePropertyEditor({ value, onChange, meta, required }: PropertyEditorProps) {
  const lines = Array.isArray(value) ? value.map((line) => String(line)).join('\n') : '';
  return (
    <TextField
      fullWidth
      size="small"
      variant="outlined"
      multiline
      rows={3}
      required={required}
      label={meta.label}
      placeholder={meta.placeholder}
      helperText={meta.helperText}
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

function BoolPropertyEditor({ value, onChange, meta }: PropertyEditorProps) {
  return (
    <FormControlLabel
      control={<Switch checked={value === true} onChange={(event) => onChange(event.target.checked)} />}
      label={meta.label ?? ''}
    />
  );
}

function RadioPropertyEditor({ value, onChange, meta }: PropertyEditorProps) {
  return (
    <FormControl component="fieldset" fullWidth>
      {meta.label ? <InputLabel shrink>{meta.label}</InputLabel> : null}
      <RadioGroup
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      >
        {(meta.options ?? []).map((option) => (
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

function SelectPropertyEditor({ value, onChange, meta, required }: PropertyEditorProps) {
  return (
    <FormControl fullWidth size="small" variant="outlined" required={required}>
      <InputLabel shrink>{meta.label}</InputLabel>
      <Select
        value={typeof value === 'string' ? value : ''}
        label={meta.label}
        onChange={(event) => onChange(event.target.value as string)}
      >
        {(meta.options ?? []).map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

type OptionItem = { label: string; value: string; isDefault?: boolean };
type LinkItem = { label: string; url: string };

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

// Редактор вариантов выбора (optionList): строка на вариант — название,
// «по умолчанию», удаление; «Добавить вариант» создаёт вариант со стабильным
// value (на него ссылаются правила «Сложной логики», поэтому не редактируется).
function OptionListPropertyEditor({ value, onChange, meta }: PropertyEditorProps) {
  const items = asArray<OptionItem>(value);
  const update = (index: number, patch: Partial<OptionItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <Box display="flex" flexDirection="column" style={{ gap: 8 }} data-testid="option-list-editor">
      {meta.label ? <Typography variant="subtitle2">{meta.label}</Typography> : null}
      {items.map((item, index) => (
        <Box key={item.value} display="flex" alignItems="center" style={{ gap: 4 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder={`Вариант ${index + 1}`}
            value={item.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <Tooltip title="По умолчанию">
            <Switch
              size="small"
              checked={item.isDefault === true}
              onChange={(event) => update(index, { isDefault: event.target.checked || undefined })}
            />
          </Tooltip>
          <IconButton
            size="small"
            aria-label="Удалить вариант"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Box>
        <Button
          size="small"
          startIcon={<Add />}
          onClick={() =>
            onChange([
              ...items,
              { label: `Вариант ${items.length + 1}`, value: `option-${crypto.randomUUID().slice(0, 8)}` },
            ])
          }
        >
          Добавить вариант
        </Button>
      </Box>
      {meta.helperText ? (
        <Typography variant="caption" color="textSecondary">
          {meta.helperText}
        </Typography>
      ) : null}
    </Box>
  );
}

// Редактор ссылок (linkList): название + URL на строку.
function LinkListPropertyEditor({ value, onChange, meta }: PropertyEditorProps) {
  const items = asArray<LinkItem>(value);
  const update = (index: number, patch: Partial<LinkItem>) =>
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  return (
    <Box display="flex" flexDirection="column" style={{ gap: 8 }} data-testid="link-list-editor">
      {meta.label ? <Typography variant="subtitle2">{meta.label}</Typography> : null}
      {items.map((item, index) => (
        <Box key={index} display="flex" alignItems="center" style={{ gap: 4 }}>
          <TextField
            size="small"
            variant="outlined"
            placeholder="Название"
            value={item.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="https://…"
            value={item.url}
            onChange={(event) => update(index, { url: event.target.value })}
          />
          <IconButton
            size="small"
            aria-label="Удалить ссылку"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Box>
        <Button size="small" startIcon={<Add />} onClick={() => onChange([...items, { label: '', url: '' }])}>
          Добавить ссылку
        </Button>
      </Box>
      {meta.helperText ? (
        <Typography variant="caption" color="textSecondary">
          {meta.helperText}
        </Typography>
      ) : null}
    </Box>
  );
}

registerPropertyEditor('text', TextPropertyEditor);
registerPropertyEditor('stringList', MultilinePropertyEditor);
registerPropertyEditor('bool', BoolPropertyEditor);
registerPropertyEditor('number', NumberPropertyEditor);
registerPropertyEditor('radio', RadioPropertyEditor);
registerPropertyEditor('select', SelectPropertyEditor);
registerPropertyEditor('optionList', OptionListPropertyEditor);
registerPropertyEditor('linkList', LinkListPropertyEditor);
