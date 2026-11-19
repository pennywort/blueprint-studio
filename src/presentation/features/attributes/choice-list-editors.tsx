import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, IconButton, Switch, TextField, Tooltip, Typography, makeStyles } from '@material-ui/core';
import {
  csvVariantLabels,
  replaceVariantLabels,
  splitVariantLabels,
  variantItemLabels,
  type VariantShape,
} from '@domain/variant-source';
import { editorIcons } from '@presentation/icons/editor-icons';
import {
  VARIANT_LABELS,
  fileSizeLabel,
  variantCountLabel,
  variantNumberLabel,
} from '@presentation/labels/editor-labels';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { AttributeField } from './attribute-field';
import { newVariantId } from './new-variant-id';
import { registerPropertyEditor, type PropertyEditorProps } from './property-editor-registry';

// Редакторы Selection list [owner 2026-11-19], как и встроенные (T-040), знают
// только описание атрибута: switches — enum взаимоисключающими switch с
// подсказкой «i» и вложенными полями выбранного варианта; optionFile и
// optionText — тот же массив вариантов (props.options), заполняемый из файла
// CSV или из текста через разделитель (domain/variant-source).

const useStyles = makeStyles<EditorTheme>((theme) => ({
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  // Как у BoolPropertyEditor: подпись слева, switch справа.
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    minHeight: 40,
  },
  switchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
  },
  hint: {
    display: 'inline-flex',
    color: theme.palette.text.secondary,
  },
  nested: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(1),
  },
  secondary: {
    color: theme.palette.text.secondary,
  },
  // Строка «Шаблон для заполнения» с кнопкой скачивания справа.
  templateRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  texts: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  // Кнопка выбора файла — тёмная, во всю ширину (макет Selection list).
  chooseButton: {
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.getContrastText(theme.palette.grey[800]),
    borderRadius: theme.editor.shape.chip,
    textTransform: 'none',
    '&:hover': {
      backgroundColor: theme.palette.grey[900],
    },
  },
  hiddenInput: {
    display: 'none',
  },
  // Карточка загруженного файла: плитка-иконка, имя, статус, размер, удаление.
  fileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  fileTile: {
    width: 64,
    height: 64,
    flexShrink: 0,
    borderRadius: theme.editor.shape.icon,
    backgroundColor: theme.palette.grey[200],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.palette.text.secondary,
  },
  fileTexts: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
    overflowWrap: 'anywhere',
  },
  error: {
    color: theme.palette.error.main,
  },
}));

// Взаимоисключающие switch: включение варианта выбирает его, выключение
// снимает значение (обязательный атрибут выключить нельзя — только выбрать
// другой вариант). Подпись атрибута — заголовок секции политики.
function SwitchesPropertyEditor({ value, onChange, attribute, disabled, renderOption }: PropertyEditorProps) {
  const classes = useStyles();
  return (
    <div className={classes.group} role="group" aria-label={attribute.label} data-testid="switches-editor">
      {(attribute.options ?? []).map((option) => {
        const checked = value === option.value;
        const nested = checked ? renderOption?.(option.value) : null;
        return (
          <div key={option.value}>
            <div className={classes.switchRow}>
              <div className={classes.switchLabel}>
                <Typography variant="body2">{option.label}</Typography>
                {option.hint ? (
                  <Tooltip title={option.hint}>
                    <span className={classes.hint}>
                      <editorIcons.info fontSize="small" />
                    </span>
                  </Tooltip>
                ) : null}
              </div>
              <Switch
                checked={checked}
                disabled={disabled}
                inputProps={{ 'aria-label': option.label }}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange(option.value);
                  } else if (!attribute.required) {
                    onChange(undefined);
                  }
                }}
              />
            </div>
            {nested ? <div className={classes.nested}>{nested}</div> : null}
          </div>
        );
      })}
      {attribute.helperText ? (
        <Typography variant="caption" className={classes.secondary}>
          {attribute.helperText}
        </Typography>
      ) : null}
    </div>
  );
}

const shapeOf = (attribute: PropertyEditorProps['attribute']): VariantShape | null =>
  attribute.item
    ? { idKey: attribute.item.idKey, labelKey: attribute.item.labelKey, template: attribute.item.template }
    : null;

// Шаблон CSV: заголовок колонки и пример строк — пользователь заполняет его
// и загружает обратно. TEMPORARY: назначение «Шаблона для заполнения» не
// подтверждено дизайнером (docs/открытые-вопросы.md).
function downloadTemplate() {
  const rows = [VARIANT_LABELS.fileTemplateHeader, variantNumberLabel(1), variantNumberLabel(2)];
  const url = URL.createObjectURL(new Blob([`${rows.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = VARIANT_LABELS.fileTemplateName;
  link.click();
  URL.revokeObjectURL(url);
}

// Список файлом: первая колонка CSV — подписи вариантов (заголовок шаблона
// пропускается). Имя и размер файла — только вид панели: в карте хранятся
// сами варианты, после перезагрузки карточка показывает их число.
function OptionFilePropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const classes = useStyles();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [empty, setEmpty] = useState(false);
  const shape = shapeOf(attribute);
  if (!shape) {
    return null;
  }
  const items = Array.isArray(value) ? value : [];
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0];
    event.target.value = '';
    if (!chosen) {
      return;
    }
    const labels = csvVariantLabels(await chosen.text(), VARIANT_LABELS.fileTemplateHeader);
    setEmpty(labels.length === 0);
    if (labels.length > 0) {
      setFile({ name: chosen.name, size: chosen.size });
      onChange(replaceVariantLabels(items, labels, shape, newVariantId));
    }
  };
  return (
    <div className={classes.group} data-testid="option-file-editor">
      <div className={classes.templateRow}>
        <div className={classes.texts}>
          <Typography variant="body2">{VARIANT_LABELS.fileTemplate}</Typography>
          <Typography variant="caption" className={classes.secondary}>
            {VARIANT_LABELS.fileTemplateFormat}
          </Typography>
        </div>
        <IconButton size="small" aria-label={VARIANT_LABELS.fileTemplateDownload} onClick={downloadTemplate}>
          <editorIcons.download />
        </IconButton>
      </div>
      <AttributeField attribute={{ label: VARIANT_LABELS.fileAttachment, required: true }}>
        <input
          ref={inputRef}
          className={classes.hiddenInput}
          type="file"
          accept=".csv,text/csv"
          data-testid="option-file-input"
          onChange={(event) => void onFile(event)}
        />
        <Button
          fullWidth
          variant="contained"
          disableElevation
          className={classes.chooseButton}
          startIcon={<editorIcons.attach />}
          onClick={() => inputRef.current?.click()}
        >
          {VARIANT_LABELS.fileChoose}
        </Button>
      </AttributeField>
      {empty ? (
        <Typography variant="caption" className={classes.error}>
          {VARIANT_LABELS.fileEmpty}
        </Typography>
      ) : null}
      {items.length > 0 ? (
        <div className={classes.fileCard} data-testid="option-file-card">
          <div className={classes.fileTile}>
            <editorIcons.file />
          </div>
          <div className={classes.fileTexts}>
            <Typography variant="body2">{file?.name ?? VARIANT_LABELS.fileFromMap}</Typography>
            <Typography variant="caption" className={classes.secondary}>
              {VARIANT_LABELS.fileLoaded}
            </Typography>
            <Typography variant="caption" className={classes.secondary}>
              {file ? fileSizeLabel(file.size) : variantCountLabel(items.length)}
            </Typography>
          </div>
          <IconButton
            size="small"
            aria-label={VARIANT_LABELS.fileRemove}
            onClick={() => {
              setFile(null);
              onChange([]);
            }}
          >
            <editorIcons.delete />
          </IconButton>
        </div>
      ) : null}
    </div>
  );
}

// Список текстом: подписи через разделитель политики. Текст — черновик поля:
// пока он разбирается в те же варианты, ввод не перебивается; иная правка
// вариантов (undo, канвас) — показ из значения.
function OptionTextPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const shape = shapeOf(attribute);
  const delimiter = attribute.delimiter ?? '';
  const labels = variantItemLabels(value, shape?.labelKey ?? '').join('\n');
  const [text, setText] = useState(() => labels.split('\n').filter(Boolean).join(`${delimiter} `));
  useEffect(() => {
    if (splitVariantLabels(text, delimiter).join('\n') !== labels) {
      setText(labels.split('\n').filter(Boolean).join(`${delimiter} `));
    }
    // Только внешняя смена значения: ввод уже согласован с текстом.
  }, [labels]);
  if (!shape) {
    return null;
  }
  return (
    <AttributeField attribute={attribute}>
      <TextField
        fullWidth
        multiline
        minRows={3}
        variant="outlined"
        placeholder={attribute.placeholder}
        value={text}
        inputProps={{ 'data-testid': 'option-text-editor' }}
        onChange={(event) => {
          setText(event.target.value);
          const items = Array.isArray(value) ? value : [];
          onChange(
            replaceVariantLabels(
              items,
              splitVariantLabels(event.target.value, delimiter),
              shape,
              newVariantId,
            ),
          );
        }}
      />
    </AttributeField>
  );
}

registerPropertyEditor('switches', SwitchesPropertyEditor);
registerPropertyEditor('optionFile', OptionFilePropertyEditor);
registerPropertyEditor('optionText', OptionTextPropertyEditor);
