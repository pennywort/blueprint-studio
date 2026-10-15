import { useRef, useState } from 'react';
import {
  Box,
  Button,
  ClickAwayListener,
  InputAdornment,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
} from '@blueprint-vendor/flamingo-core';
import { Search } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  search: {
    width: '100%',
    maxWidth: 520,
    '& .MuiOutlinedInput-root': {
      backgroundColor: theme.palette.background.paper,
      borderRadius: 24,
      '& fieldset': {
        borderColor: theme.palette.divider,
      },
      '&:hover fieldset': {
        borderColor: theme.palette.divider,
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
    },
    '& .MuiOutlinedInput-input': {
      padding: theme.spacing(1.25, 2),
    },
  },
  saveButton: {
    color: theme.palette.text.primary,
    textTransform: 'none',
  },
  previewButton: {
    backgroundColor: theme.editor.secondaryButtonBackground,
    color: theme.palette.text.primary,
    borderRadius: 24,
    textTransform: 'none',
    padding: theme.spacing(1, 3),
    '&:hover': {
      backgroundColor: theme.editor.secondaryButtonHoverBackground,
    },
  },
  results: {
    width: 520,
    maxHeight: 360,
    overflowY: 'auto',
    marginTop: theme.spacing(0.5),
    borderRadius: 12,
  },
  resultItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  approvalButton: {
    borderRadius: 24,
    textTransform: 'none',
    padding: theme.spacing(1, 3),
  },
}));

// Результат поиска по канвасу (T-050): узел или элемент внутри узла.
export type CanvasSearchResult = {
  key: string;
  nodeId: string;
  /** null — найден сам узел. */
  elementId: string | null;
  title: string;
  /** Где лежит результат (название узла) — вторая строка в выпадающем списке. */
  context: string;
};

export type EditorTopBarProps = {
  /** «Сохранить» → IGraphRepository (T-053). */
  onSave?: () => void;
  /** «Экспорт JSON» — текущий граф в файл проекта [owner 2026-10-15]. */
  onExport?: () => void;
  /** Маршрут предпросмотра подключается в T-051; сейчас — заглушка-обработчик. */
  onPreview?: () => void;
  /** Поиск по канвасу (T-050): совпадения по названиям узлов и элементов. */
  searchCanvas?: (query: string) => CanvasSearchResult[];
  /** Выбор результата: выделение + центрирование вьюпорта. */
  onSelectSearchResult?: (result: CanvasSearchResult) => void;
};

// Верхняя панель редактора (T-020, макет «макет-главного-экрана»): поисковое
// поле слева, справа «Сохранить» (text), «Предпросмотр» (нейтральная пилюля),
// «На согласование» (primary dark). Действия пока заглушки, разметка и
// состояния реальные. Цвета — только из темы (D6). «На согласование» —
// неактивна до workflow FSM (T-052, эпик 004).
export function EditorTopBar({
  onSave,
  onExport,
  onPreview,
  searchCanvas,
  onSelectSearchResult,
}: EditorTopBarProps) {
  const classes = useStyles();
  const [searchValue, setSearchValue] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const searchAnchorRef = useRef<HTMLDivElement | null>(null);
  const query = searchValue.trim();
  const results = query && searchCanvas ? searchCanvas(query) : [];

  const pickResult = (result: CanvasSearchResult) => {
    setResultsOpen(false);
    onSelectSearchResult?.(result);
  };

  return (
    <Box
      component="header"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      paddingX={3}
      paddingY={1.5}
      data-testid="editor-top-bar"
    >
      <ClickAwayListener onClickAway={() => setResultsOpen(false)}>
        <div className={classes.search} ref={searchAnchorRef}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder="Начните вводить"
            aria-label="Поиск по канвасу"
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value);
              setResultsOpen(true);
            }}
            onFocus={() => setResultsOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) {
                pickResult(results[0]);
              } else if (event.key === 'Escape') {
                setResultsOpen(false);
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Popper
            open={resultsOpen && query.length > 0}
            anchorEl={searchAnchorRef.current}
            placement="bottom-start"
            style={{ zIndex: 1300 }}
          >
            <Paper className={classes.results} data-testid="canvas-search-results">
              {results.length > 0 ? (
                <MenuList dense>
                  {results.map((result) => (
                    <MenuItem
                      key={result.key}
                      className={classes.resultItem}
                      onClick={() => pickResult(result)}
                    >
                      <Typography variant="body2">{result.title}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {result.context}
                      </Typography>
                    </MenuItem>
                  ))}
                </MenuList>
              ) : (
                <Box padding={2}>
                  <Typography variant="body2" color="textSecondary">
                    Ничего не найдено
                  </Typography>
                </Box>
              )}
            </Paper>
          </Popper>
        </div>
      </ClickAwayListener>
      <Box display="flex" alignItems="center" gridGap={16}>
        <Button className={classes.saveButton} onClick={onSave}>
          Сохранить
        </Button>
        <Button className={classes.saveButton} onClick={onExport} data-testid="export-json">
          Экспорт JSON
        </Button>
        <Button className={classes.previewButton} variant="contained" disableElevation onClick={onPreview}>
          Предпросмотр
        </Button>
        {/* T-052: согласование — переход workflow FSM (XState, эпик 004); до
            него кнопка неактивна. span — disabled-кнопка не ловит hover. */}
        <Tooltip title="Согласование появится вместе с workflow карты (эпик 004)">
          <span>
            <Button
              className={classes.approvalButton}
              variant="contained"
              color="primary"
              disableElevation
              disabled
            >
              На согласование
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}
