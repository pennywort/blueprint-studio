import { useState } from 'react';
import { Box, Divider, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import { useContainer } from '@presentation/app/App';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { EditorCanvas } from '@presentation/features/canvas/editor-canvas';
import { EmptyCanvasState } from '@presentation/features/canvas/empty-canvas-state';
import { useEditorGraph } from '@presentation/features/canvas/use-editor-graph';
import { useCanvasPointerHeld } from '@presentation/features/canvas/use-selection';
import { AttributesPanel } from '@presentation/features/attributes/attributes-panel';
import { EditorNotificationsProvider } from '@presentation/features/notifications/editor-notifications';
import { EditorTopBar } from '@presentation/features/top-bar/editor-top-bar';
import { EditorToolbar, type EditorSidePanel } from '@presentation/features/toolbar/editor-toolbar';

const SIDE_PANEL_TITLES: Record<EditorSidePanel, string> = {
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
  const schemaByKind = new Map(elementSchemas.map((schema) => [schema.kind, schema]));
  // TEMPORARY (до effector): граф в React state, мутации только через
  // CommandBus — см. use-editor-graph.ts.
  const editorGraph = useEditorGraph();

  // Панель-заглушка кнопки 4 тулбара (Q-1: назначение не подтверждено).
  const [sidePanel, setSidePanel] = useState<EditorSidePanel | null>(null);
  // Инспектор: выделенный компонент формы + его правила видимости (T-067).
  const selectedElement = editorGraph.selectedElement;
  // Панель открывается по отпусканию ЛКМ, а не по нажатию: пока кнопка
  // удержана, это попытка переноса, и сужение канваса её срывает (баг drag).
  const pointerHeld = useCanvasPointerHeld();

  return (
    <Box display="flex" flexDirection="column" height="100vh" bgcolor="background.default">
      <EditorTopBar
        onSave={editorGraph.save}
        onExport={editorGraph.exportJson}
        searchCanvas={editorGraph.searchCanvas}
        onSelectSearchResult={editorGraph.selectSearchResult}
      />
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
            interactionStore={editorGraph.interactionStore}
            canvasActions={editorGraph.canvasActions}
            canUndo={editorGraph.canUndo}
            canRedo={editorGraph.canRedo}
            onUndo={editorGraph.undo}
            onRedo={editorGraph.redo}
            onConnectLink={editorGraph.connect}
            onReconnectLink={editorGraph.reconnect}
            onDeleteLinks={editorGraph.disconnect}
            onDeleteNodes={editorGraph.removeNodes}
            onReorderNode={editorGraph.reorderInLayer}
            onMoveNodeToDepth={editorGraph.moveNodeToDepth}
            onDeleteSelectedElement={editorGraph.deleteSelectedElement}
            onSelectedNodeChange={editorGraph.onSelectedNodeChange}
            onClearSelection={editorGraph.clearSelection}
            onNodesMeasured={editorGraph.reportNodeSizes}
            focus={editorGraph.focus}
            onConnectionStart={editorGraph.startConnection}
            onConnectionEnd={editorGraph.endConnection}
            isConnectionAllowed={editorGraph.isConnectionAllowed}
            connecting={editorGraph.connecting}
          />
          {/* Пустое состояние (T-024): поверх канваса, не перехватывает
              события мыши — pan/zoom и тулбар работают сквозь него. hasNodes
              подключён к реальному графу (S9). */}
          <EmptyCanvasState hasNodes={editorGraph.hasNodes} />
          {/* Полоса на всю высоту только центрирует тулбар: события мыши
              пропускает (pointer-events: none) — иначе перекрывала undo/redo
              в левом нижнем углу и полотно под собой. */}
          <Box
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            display="flex"
            alignItems="center"
            paddingLeft={2}
            style={{ pointerEvents: 'none' }}
          >
            <Box style={{ pointerEvents: 'auto' }}>
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
        </Box>
        {selectedElement !== null && !pointerHeld ? (
          <>
            <Divider orientation="vertical" flexItem />
            <Box className={classes.attributesPanel} data-testid="attributes-panel">
              <AttributesPanel
                component={selectedElement.component}
                schema={schemaByKind.get(selectedElement.component.kind) ?? null}
                onUpdateProps={editorGraph.updateElementProps}
                onToggleComplexLogic={
                  selectedElement.component.kind === 'selectList' && selectedElement.inFormStep
                    ? () => editorGraph.toggleComplexLogic(selectedElement.component.id)
                    : undefined
                }
                incomingRules={selectedElement.incomingRules}
                onRemoveRule={editorGraph.removeLogicRule}
              />
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  );
}
