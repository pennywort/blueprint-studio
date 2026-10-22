import { useState } from 'react';
import { Divider, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import {
  ElementCatalogProvider,
  useElementCatalog,
} from '@presentation/features/element-catalog/element-catalog';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { EditorCanvas } from '@presentation/features/canvas/editor-canvas';
import { EmptyCanvasState } from '@presentation/features/canvas/empty-canvas-state';
import { useEditorGraph } from '@presentation/features/canvas/use-editor-graph';
import { useCanvasPointerHeld } from '@presentation/features/canvas/use-selection';
import { AttributesPanel } from '@presentation/features/attributes/attributes-panel';
import { EditorNotificationsProvider } from '@presentation/features/notifications/editor-notifications';
import { SettingsIssuesNotifier } from '@presentation/features/settings/settings-issues-notifier';
import {
  HotkeysProvider,
  useHotkeyHandlers,
  useHotkeysRoot,
} from '@presentation/features/hotkeys/hotkeys-provider';
import { EditorTopBar } from '@presentation/features/top-bar/editor-top-bar';
import { EditorToolbar, type EditorSidePanel } from '@presentation/features/toolbar/editor-toolbar';

const SIDE_PANEL_TITLES: Record<EditorSidePanel, string> = {
  navigation: 'Навигация',
};

// Вёрстка — div + makeStyles, а не Box (R-BOX, docs/refactoring): Box MUI v4
// пересчитывает стили на каждый рендер, а страница перерисовывается на
// каждую команду графа; классы makeStyles создаются один раз.
const useStyles = makeStyles<EditorTheme>((theme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: theme.palette.background.default,
  },
  body: {
    display: 'flex',
    flexGrow: 1,
    minHeight: 0,
  },
  canvasArea: {
    flexGrow: 1,
    minWidth: 0,
    position: 'relative',
  },
  // Полоса на всю высоту только центрирует тулбар: события мыши пропускает
  // (pointer-events: none) — иначе перекрывала undo/redo в левом нижнем углу
  // и полотно под собой.
  toolbarRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: theme.spacing(2),
    pointerEvents: 'none',
  },
  toolbarSlot: {
    pointerEvents: 'auto',
  },
  sidePanel: {
    width: 320,
    flexShrink: 0,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
  },
  // Панель атрибутов — карточка с отступом от краёв и своим скроллом
  // (макеты docs/design-mockups/настройка-атрибутов-*, T-041).
  attributesPanel: {
    width: 360,
    flexShrink: 0,
    alignSelf: 'flex-start',
    maxHeight: `calc(100% - ${theme.spacing(4)}px)`,
    margin: theme.spacing(2, 2, 2, 0),
    overflowY: 'auto',
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.editor.shape.pill,
    padding: theme.spacing(2.5),
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
        {/* Ошибки настроек администратора/пользователя — уведомлением (R-ADM). */}
        <SettingsIssuesNotifier />
        {/* Хоткеи редактора [owner 2026-10-15]: провайдер без разметки,
            значение меняется только со сменой настроек хоткеев (R-ADM). */}
        <HotkeysProvider>
          {/* Описания элементов (схема + политика редактора) — для канваса,
              меню и панели атрибутов (этап 3 docs/schemas/PLAN.md). */}
          <ElementCatalogProvider>
            <EditorPageLayout />
          </ElementCatalogProvider>
        </HotkeysProvider>
      </EditorNotificationsProvider>
    </EditorThemeProvider>
  );
}

// Каркас страницы (T-022): TopBar сверху, левый тулбар — плавающая пилюля
// поверх канваса по левому краю (как на макетах), панель атрибутов справа
// скрыта, пока нет выделения (D10). Канвас и нижние контролы не меняются (T-011).
function EditorPageLayout() {
  const classes = useStyles();
  const catalog = useElementCatalog();
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

  // Корень страницы — граница хоткеев; команды страницы — только
  // «команда → действие», комбинации — в keybindings (features/hotkeys).
  const hotkeysRoot = useHotkeysRoot();
  useHotkeyHandlers({
    'project.save': editorGraph.save,
    'edit.undo': editorGraph.undo,
    'edit.redo': editorGraph.redo,
    'edit.copy': editorGraph.copySelectedElement,
    'edit.cut': editorGraph.cutSelectedElement,
    'edit.paste': editorGraph.pasteElement,
  });

  return (
    <div ref={hotkeysRoot} className={classes.root}>
      <EditorTopBar
        onSave={editorGraph.save}
        onExport={editorGraph.exportJson}
        searchCanvas={editorGraph.searchCanvas}
        onSelectSearchResult={editorGraph.selectSearchResult}
      />
      <div className={classes.body}>
        {sidePanel !== null ? (
          <>
            <div className={classes.sidePanel} data-testid={`side-panel-${sidePanel}`}>
              <Typography variant="h6">{SIDE_PANEL_TITLES[sidePanel]}</Typography>
              <Typography variant="body2" color="textSecondary">
                Панель-заглушка: назначение уточняется у владельца (Q-1).
              </Typography>
            </div>
            <Divider orientation="vertical" flexItem />
          </>
        ) : null}
        <div className={classes.canvasArea}>
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
          <div className={classes.toolbarRail}>
            <div className={classes.toolbarSlot}>
              <EditorToolbar
                elementSchemas={catalog.schemas}
                activePanel={sidePanel}
                onPanelChange={setSidePanel}
                selectedNodeType={editorGraph.selectedNodeType}
                hasHome={editorGraph.hasHome}
                onAddNode={editorGraph.addNode}
                onAddElement={editorGraph.addElement}
              />
            </div>
          </div>
        </div>
        {selectedElement !== null && !pointerHeld ? (
          <div className={classes.attributesPanel}>
            <AttributesPanel
              component={selectedElement.component}
              schema={catalog.schema(selectedElement.component.kind)}
              onUpdateProps={editorGraph.updateElementProps}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
