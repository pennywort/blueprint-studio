import { useMemo, useState } from 'react';
import { Button, InputAdornment, TextField, Typography, makeStyles } from '@material-ui/core';
import { Search } from '@material-ui/icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { AttributeField } from './attribute-field';
import { IconStub } from './icon-stub';
import type { PropertyEditorProps } from './property-editor-registry';

// Редактор иконки (атрибут типа icon — $ref на shared/icon.schema.json,
// [owner 2026-10-20]; макет docs/design-mockups/настройка-атрибутов-элемента-listitem.png):
// подпись «Иконка», строка поиска и сетка иконок. Значение — имя иконки из
// enum схемы (attribute.options), повторный клик по выбранной снимает prop.
// Без тултипов [owner 2026-10-20]: при быстром скролле они «улетали».

const COLUMNS = 6;
// Свёрнутая сетка — три ряда, как на макете; «Смотреть все» — весь список.
const COLLAPSED_ROWS = 3;
// Развёрнутая сетка виртуализирована по рядам [owner 2026-10-20]: в DOM —
// только видимые ряды + запас; высота ряда фиксирована (плитка + зазор).
const TILE = 40;
const GAP = 4;
const ROW = TILE + GAP;
const VIEWPORT_ROWS = 6;
const OVERSCAN_ROWS = 2;

const useStyles = makeStyles<EditorTheme>((theme) => ({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
  },
  viewport: {
    height: VIEWPORT_ROWS * ROW,
    overflowY: 'auto',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
    gridAutoRows: TILE,
    gap: GAP,
  },
  tile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
  const [firstRow, setFirstRow] = useState(0);
  const selected = typeof value === 'string' ? value : null;

  const names = useMemo(() => (attribute.options ?? []).map((option) => option.value), [attribute.options]);
  const found = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? names.filter((name) => name.toLowerCase().includes(needle)) : names;
  }, [names, query]);
  const collapsedCount = COLLAPSED_ROWS * COLUMNS;
  const virtual = expanded && found.length > collapsedCount;

  const tile = (name: string) => (
    <button
      key={name}
      type="button"
      aria-label={name}
      aria-pressed={name === selected}
      data-testid={`icon-option-${name}`}
      className={`${classes.tile} ${name === selected ? classes.tileSelected : ''}`}
      onClick={() => onChange(name === selected && !attribute.required ? undefined : name)}
    >
      <IconStub name={name} />
    </button>
  );

  let grid = null;
  if (virtual) {
    const totalRows = Math.ceil(found.length / COLUMNS);
    const start = Math.max(0, firstRow - OVERSCAN_ROWS);
    const end = Math.min(totalRows, firstRow + VIEWPORT_ROWS + OVERSCAN_ROWS);
    grid = (
      <div
        // Новый поиск — новый вьюпорт со scrollTop 0 (согласован с firstRow = 0).
        key={query}
        className={classes.viewport}
        data-testid="icon-grid-viewport"
        // setState с тем же рядом React пропускает — перерисовка только на смене ряда.
        onScroll={(event) => setFirstRow(Math.floor(event.currentTarget.scrollTop / ROW))}
      >
        <div style={{ height: totalRows * ROW - GAP, paddingTop: start * ROW, boxSizing: 'border-box' }}>
          <div className={classes.grid}>{found.slice(start * COLUMNS, end * COLUMNS).map(tile)}</div>
        </div>
      </div>
    );
  } else if (found.length > 0) {
    grid = <div className={classes.grid}>{found.slice(0, collapsedCount).map(tile)}</div>;
  }

  return (
    <AttributeField attribute={attribute} variant="heading">
      <div className={classes.body} data-testid="icon-editor">
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          placeholder="Поиск"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setFirstRow(0);
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Search fontSize="small" className={classes.muted} />
              </InputAdornment>
            ),
          }}
        />
        {grid ?? (
          <Typography variant="body2" className={classes.muted}>
            Ничего не найдено
          </Typography>
        )}
        {selected ? (
          <Typography variant="caption" className={classes.muted} data-testid="icon-selected">
            Выбрано: {selected}
          </Typography>
        ) : null}
        {found.length > collapsedCount ? (
          <Button
            fullWidth
            size="small"
            className={classes.more}
            onClick={() => {
              setExpanded(!expanded);
              setFirstRow(0);
            }}
          >
            {expanded ? 'Свернуть' : `Смотреть все (${found.length})`}
          </Button>
        ) : null}
      </div>
    </AttributeField>
  );
}
