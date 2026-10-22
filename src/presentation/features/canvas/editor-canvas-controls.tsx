import { Panel, useReactFlow, useStore, type ReactFlowState } from '@xyflow/react';
import { Box, IconButton, Typography, makeStyles } from '@material-ui/core';
import { editorIcons } from '@presentation/icons/editor-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => {
  const canvas = theme.editor.canvas;
  return {
    group: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: canvas.controlsBackground,
      borderRadius: theme.editor.shape.pill,
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
    // Включённый инструмент «Рука» (editor-config canvas.panTool).
    pressed: {
      color: canvas.edgeActive,
      backgroundColor: canvas.controlsHoverBackground,
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
  /** Режим «Рука»; без onTogglePanMode кнопки нет (editor-config canvas.panTool). */
  panMode?: boolean;
  onTogglePanMode?: () => void;
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
  panMode = false,
  onTogglePanMode,
}: EditorCanvasControlsProps) {
  const classes = useStyles();
  const { zoomIn, zoomOut, fitView } = useReactFlow();

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
            <editorIcons.undo fontSize="small" />
          </IconButton>
          <IconButton
            className={classes.button}
            size="small"
            aria-label="Повторить"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <editorIcons.redo fontSize="small" />
          </IconButton>
        </Box>
      </Panel>
      <Panel position="bottom-right">
        <Box className={classes.row}>
          {onTogglePanMode ? (
            <div className={classes.group} data-testid="pan-tool-group">
              <IconButton
                className={panMode ? `${classes.button} ${classes.pressed}` : classes.button}
                size="small"
                aria-label="Рука (H)"
                aria-pressed={panMode}
                onClick={onTogglePanMode}
              >
                <editorIcons.panTool fontSize="small" />
              </IconButton>
            </div>
          ) : null}
          <Box className={classes.group} data-testid="zoom-group">
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Вместить карту"
              onClick={() => void fitView()}
            >
              <editorIcons.fitView fontSize="small" />
            </IconButton>
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Уменьшить масштаб"
              onClick={() => void zoomOut()}
            >
              <editorIcons.zoomOut fontSize="small" />
            </IconButton>
            <ZoomLabel className={classes.zoomLabel} />
            <IconButton
              className={classes.button}
              size="small"
              aria-label="Увеличить масштаб"
              onClick={() => void zoomIn()}
            >
              <editorIcons.zoomIn fontSize="small" />
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
              <editorIcons.minimap fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Panel>
    </>
  );
}

// Текущий масштаб — отдельный компонент с подпиской на округлённый процент
// (R-PERF): useViewport перерисовывал всю панель на каждый кадр pan, хотя
// процент при pan не меняется.
const selectZoomPercent = (state: ReactFlowState) => Math.round(state.transform[2] * 100);

function ZoomLabel({ className }: { className?: string }) {
  const percent = useStore(selectZoomPercent);
  return (
    <Typography className={className} variant="body2" aria-label="Текущий масштаб">
      {percent}%
    </Typography>
  );
}
