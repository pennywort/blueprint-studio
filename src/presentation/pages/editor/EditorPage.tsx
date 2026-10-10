import { useState } from 'react';
import { Box, Divider, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { useContainer } from '@presentation/app/App';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { EditorCanvas } from '@presentation/features/canvas/editor-canvas';
import { EmptyCanvasState } from '@presentation/features/canvas/empty-canvas-state';
import { useEditorGraph } from '@presentation/features/canvas/use-editor-graph';
import {
  EditorNotificationsProvider,
  useEditorNotifications,
} from '@presentation/features/notifications/editor-notifications';
import { EditorTopBar } from '@presentation/features/top-bar/editor-top-bar';
import { EditorToolbar, type EditorSidePanel } from '@presentation/features/toolbar/editor-toolbar';

const SIDE_PANEL_TITLES: Record<EditorSidePanel, string> = {
  json: 'JSON',
  navigation: 'Навигация',
};

const useStyles = makeStyles<EditorTheme>((theme) => ({
  sidePanel: {
    width: 320,
    flexShrink: 0,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
  },
  attributesPanel: {
    width: 360,
    flexShrink: 0,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
  },
}));

// Страница редактора: тема на корне редактора (T-010, D6). Разметка живёт во
// внутреннем компоненте ниже провайдера — makeStyles читает тему из контекста.
export function EditorPage() {
  return (
    <EditorThemeProvider>
      {/* Единый Snackbar-фасад страницы (T-023): уведомления живут в одном
          провайдере, а не размазаны по компонентам. */}
      <EditorNotificationsProvider>
        <EditorPageLayout />
      </EditorNotificationsProvider>
    </EditorThemeProvider>
  );
}

// Каркас страницы (T-022) собран полностью из компонентов дизайн-системы
// (Box/Divider, самописной вёрстки нет): TopBar сверху, левый тулбар —
// плавающая пилюля поверх канваса по левому краю (как на макетах), панель
// атрибутов справа скрыта, пока нет выделения (D10). Канвас и нижние
// контролы не меняются (T-011).
function EditorPageLayout() {
  const classes = useStyles();
  const container = useContainer();
  const elementSchemas = container.cradle.elementSchemaProvider.listSchemas();
  const notifications = useEditorNotifications();
  // TEMPORARY (до effector): граф в React state, мутации только через
  // CommandBus — см. use-editor-graph.ts.
  const editorGraph = useEditorGraph();

  // Панели-заглушки кнопок 3–4 тулбара (Q-1: назначение не подтверждено).
  const [sidePanel, setSidePanel] = useState<EditorSidePanel | null>(null);
  // Выделение элемента появится со schema-driven панелью атрибутов (T-041);
  // пока селектора нет — панель всегда скрыта.
  const [selectedElementId] = useState<string | null>(null);

  return (
    <Box display="flex" flexDirection="column" height="100vh" bgcolor="background.default">
      {/* Реального сохранения нет (T-053): кнопка подключена к фасаду
          уведомлений как заглушка успеха. */}
      <EditorTopBar onSave={notifications.showSaveSuccess} />
      <Box display="flex" flexGrow={1} minHeight={0}>
        {sidePanel !== null ? (
          <>
            <Box className={classes.sidePanel} data-testid={`side-panel-${sidePanel}`}>
              <Typography variant="h6">{SIDE_PANEL_TITLES[sidePanel]}</Typography>
              <Typography variant="body2" color="textSecondary">
                Панель-заглушка: назначение уточняется у владельца (Q-1).
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
          </>
        ) : null}
        <Box flexGrow={1} minWidth={0} position="relative">
          {/* Узлы/рёбра — из графа (graphToFlow + computeLayout); связи и
              порядок в слое уходят обратно командами (T-032/T-036). */}
          <EditorCanvas
            nodes={editorGraph.nodes}
            edges={editorGraph.edges}
            canUndo={editorGraph.canUndo}
            canRedo={editorGraph.canRedo}
            onUndo={editorGraph.undo}
            onRedo={editorGraph.redo}
            onConnectLink={editorGraph.connect}
            onReconnectLink={editorGraph.reconnect}
            onDeleteLinks={editorGraph.disconnect}
            onReorderNode={editorGraph.reorderInLayer}
            onSelectedNodeChange={editorGraph.onSelectedNodeChange}
          />
          {/* Пустое состояние (T-024): поверх канваса, не перехватывает
              события мыши — pan/zoom и тулбар работают сквозь него. hasNodes
              подключён к реальному графу (S9). */}
          <EmptyCanvasState hasNodes={editorGraph.hasNodes} />
          <Box
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            display="flex"
            alignItems="center"
            paddingLeft={2}
          >
            <EditorToolbar
              elementSchemas={elementSchemas}
              activePanel={sidePanel}
              onPanelChange={setSidePanel}
              selectedNodeType={editorGraph.selectedNodeType}
              hasHome={editorGraph.hasHome}
              onAddNode={editorGraph.addNode}
              onAddElement={editorGraph.addElement}
            />
          </Box>
        </Box>
        {selectedElementId !== null ? (
          <>
            <Divider orientation="vertical" flexItem />
            <Box className={classes.attributesPanel} data-testid="attributes-panel">
              <Typography variant="h6">Атрибуты элемента</Typography>
              <Typography variant="body2" color="textSecondary">
                Рендер полей по схеме элемента — T-041.
              </Typography>
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
