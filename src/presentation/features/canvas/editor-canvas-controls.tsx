import { Panel, useReactFlow, useViewport } from '@xyflow/react';
import { Box, IconButton, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { Map as MapIcon, Redo, Undo, ZoomIn, ZoomOut, ZoomOutMap } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => {
  const canvas = theme.editor.canvas;
  return {
    group: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: canvas.controlsBackground,
      borderRadius: 24,
      padding: theme.spacing(0.5),
      // Соседние пилюли правой группы идут с зазором.
      '& + &': {
        marginLeft: theme.spacing(1),
      },
    },
    row: {
      display: 'flex',
      alignItems: 'center',
    },
    button: {
      color: canvas.controlsForeground,
      '&:hover': {
        backgroundColor: canvas.controlsHoverBackground,
      },
    },
    zoomLabel: {
      minWidth: 56,
      textAlign: 'center',
      color: canvas.controlsForeground,
      userSelect: 'none',
    },
  };
});

export type EditorCanvasControlsProps = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  miniMapVisible: boolean;
  onToggleMiniMap: () => void;
};

// Нижняя панель канваса по макету (T-011): undo/redo — отдельной группой
// слева; справа — fit / zoom-out / % / zoom-in и отдельная пилюля
// переключения миникарты. Цвета — только из токенов темы (D6).
export function EditorCanvasControls({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  miniMapVisible,
  onToggleMiniMap,
}: EditorCanvasControlsProps) {
  const classes = useStyles();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  return (
    <>
      <Panel position="bottom-left">
        <Box className={classes.group} data-testid="undo-redo-group">
          <IconButton
            className={classes.button}
            size="small"
            aria-label="Отменить"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <Undo fontSize="small" />
          </IconButton>
          <IconButton
            className={classes.button}
            size="small"
            aria-label="Повторить"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <Redo fontSize="small" />
          </IconButton>
        </Box>
      </Panel>
      <Panel position="bottom-right">
        <Box className={classes.row}>
          <Box className={classes.group} data-testid="zoom-group">
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Вместить карту"
              onClick={() => void fitView()}
            >
              <ZoomOutMap fontSize="small" />
            </IconButton>
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Уменьшить масштаб"
              onClick={() => void zoomOut()}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
            <Typography className={classes.zoomLabel} variant="body2" aria-label="Текущий масштаб">
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Увеличить масштаб"
              onClick={() => void zoomIn()}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </Box>
          <Box className={classes.group} data-testid="minimap-toggle-group">
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Миникарта"
              aria-pressed={miniMapVisible}
              onClick={onToggleMiniMap}
            >
              <MapIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Panel>
    </>
  );
}
