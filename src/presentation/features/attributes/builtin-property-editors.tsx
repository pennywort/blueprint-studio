import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
} from '@blueprint-vendor/flamingo-core';
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

registerPropertyEditor('text', TextPropertyEditor);
registerPropertyEditor('stringList', MultilinePropertyEditor);
registerPropertyEditor('bool', BoolPropertyEditor);
registerPropertyEditor('number', NumberPropertyEditor);
registerPropertyEditor('radio', RadioPropertyEditor);
registerPropertyEditor('select', SelectPropertyEditor);
