import { useState } from 'react';
import { Box, Button, InputAdornment, TextField, makeStyles } from '@blueprint-vendor/flamingo-core';
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
  approvalButton: {
    borderRadius: 24,
    textTransform: 'none',
    padding: theme.spacing(1, 3),
  },
}));

export type EditorTopBarProps = {
  /** Сохранение появится в T-053; сейчас — заглушка-обработчик. */
  onSave?: () => void;
  /** Маршрут предпросмотра подключается в T-051; сейчас — заглушка-обработчик. */
  onPreview?: () => void;
  /** Точка интеграции с workflow FSM (T-052, эпик 004); сейчас — заглушка-обработчик. */
  onSubmitForApproval?: () => void;
  /** Поиск по канвасу реализуется в T-050; здесь поле уже управляемое. */
  onSearchChange?: (value: string) => void;
};

// Верхняя панель редактора (T-020, макет «макет-главного-экрана»): поисковое
// поле слева, справа «Сохранить» (text), «Предпросмотр» (нейтральная пилюля),
// «На согласование» (primary dark). Действия пока заглушки, разметка и
// состояния реальные. Цвета — только из темы (D6).
export function EditorTopBar({ onSave, onPreview, onSubmitForApproval, onSearchChange }: EditorTopBarProps) {
  const classes = useStyles();
  const [searchValue, setSearchValue] = useState('');

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
      <TextField
        className={classes.search}
        variant="outlined"
        size="small"
        placeholder="Начните вводить"
        aria-label="Поиск по канвасу"
        value={searchValue}
        onChange={(event) => {
          setSearchValue(event.target.value);
          onSearchChange?.(event.target.value);
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Search fontSize="small" />
            </InputAdornment>
          ),
        }}
      />
      <Box display="flex" alignItems="center" gridGap={16}>
        <Button className={classes.saveButton} onClick={onSave}>
          Сохранить
        </Button>
        <Button className={classes.previewButton} variant="contained" disableElevation onClick={onPreview}>
          Предпросмотр
        </Button>
        <Button
          className={classes.approvalButton}
          variant="contained"
          color="primary"
          disableElevation
          onClick={onSubmitForApproval}
        >
          На согласование
        </Button>
      </Box>
    </Box>
  );
}
