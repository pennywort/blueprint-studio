import { useMemo, useState } from 'react';
import {
  Button,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Search } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { AttributeField } from './attribute-field';
import { IconStub } from './icon-stub';
import type { PropertyEditorProps } from './property-editor-registry';

// Редактор иконки (атрибут типа icon — $ref на shared/icon.schema.json,
// [owner 2026-10-20]; макет docs/design-mockups/настройка-атрибутов-элемента-listitem.png):
// подпись «Иконка», строка поиска и сетка иконок. Значение — имя иконки из
// enum схемы (attribute.options), повторный клик по выбранной снимает prop.

// Свёрнутая сетка — три ряда по шесть, как на макете; «Смотреть все» — весь список.
const COLLAPSED_COUNT = 18;

const useStyles = makeStyles<EditorTheme>((theme) => ({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: theme.spacing(0.5),
  },
  gridExpanded: {
    maxHeight: 240,
    overflowY: 'auto',
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    padding: 0,
    border: `1px solid transparent`,
    borderRadius: theme.shape.borderRadius * 2,
    background: 'none',
    cursor: 'pointer',
    color: theme.palette.text.primary,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  tileSelected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected,
  },
  more: {
    backgroundColor: theme.editor.secondaryButtonBackground,
    textTransform: 'none',
    '&:hover': {
      backgroundColor: theme.editor.secondaryButtonHoverBackground,
    },
  },
  muted: {
    color: theme.palette.text.secondary,
  },
}));

export function IconPropertyEditor({ value, onChange, attribute }: PropertyEditorProps) {
  const classes = useStyles();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const selected = typeof value === 'string' ? value : null;

  const names = useMemo(() => (attribute.options ?? []).map((option) => option.value), [attribute.options]);
  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? names.filter((name) => name.toLowerCase().includes(needle)) : names;
  }, [names, query]);
  const visible = expanded ? found : found.slice(0, COLLAPSED_COUNT);

  return (
    <AttributeField attribute={attribute} variant="heading">
      <div className={classes.body} data-testid="icon-editor">
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Поиск"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search fontSize="small" className={classes.muted} />
              </InputAdornment>
            ),
          }}
        />
        {visible.length > 0 ? (
          <div className={`${classes.grid} ${expanded ? classes.gridExpanded : ''}`}>
            {visible.map((name) => (
              <Tooltip key={name} title={name} placement="top">
                <button
                  type="button"
                  aria-label={name}
                  aria-pressed={name === selected}
                  data-testid={`icon-option-${name}`}
                  className={`${classes.tile} ${name === selected ? classes.tileSelected : ''}`}
                  onClick={() => onChange(name === selected && !attribute.required ? undefined : name)}
                >
                  <IconStub name={name} />
                </button>
              </Tooltip>
            ))}
          </div>
        ) : (
          <Typography variant="body2" className={classes.muted}>
            Ничего не найдено
          </Typography>
        )}
        {selected ? (
          <Typography variant="caption" className={classes.muted} data-testid="icon-selected">
            Выбрано: {selected}
          </Typography>
        ) : null}
        {found.length > COLLAPSED_COUNT ? (
          <Button fullWidth size="small" className={classes.more} onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Свернуть' : `Смотреть все (${found.length})`}
          </Button>
        ) : null}
      </div>
    </AttributeField>
  );
}
