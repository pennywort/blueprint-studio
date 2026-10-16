import { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, makeStyles } from '@blueprint-vendor/flamingo-core';
import { AccountTree, Code, NoteAdd, ViewColumn } from '@blueprint-vendor/flamingo-icons';
import type { ElementSchema } from '@application/ports/element-schema-provider';
import type { CanvasElementKind } from '@domain/model/canvas-element';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import type { CanvasNodeType } from '@presentation/features/canvas/graph-flow-adapter';
import { ELEMENT_KIND_LABELS, NODE_KIND_LABELS } from '@presentation/labels/editor-labels';

// Панель-заглушка кнопки 4: назначение не подтверждено владельцем (Q-1),
// поэтому панель только переключается, содержимое не выдумываем.
export type EditorSidePanel = 'navigation';

// Узлы из меню кнопки 1 (макет «меню-добавления-и-заглушка-пустого-проекта»).
export type AddableNodeKind = 'home' | 'subScenario' | 'applicationForm';

// Элемент из меню кнопки 2 (T-034): любой элемент — в любой выделенный узел
// [owner 2026-10-13, ADR-17]: List item, Widget card и компоненты формы —
// все из listSchemas() провайдера (T-041: у List item/Widget card — stub-схемы).
export type AddableElementKind = CanvasElementKind;

export type EditorToolbarProps = {
  /** Список схем элементов — из listSchemas() порта IElementSchemaProvider (передаёт EditorPage из DI). */
  elementSchemas: readonly ElementSchema[];
  activePanel: EditorSidePanel | null;
  onPanelChange: (panel: EditorSidePanel | null) => void;
  /** Тип выделенного на канвасе узла — определяет состав меню элементов; null — меню недоступно. */
  selectedNodeType: CanvasNodeType | null;
  /** «Главная» в меню узлов доступна, только если её ещё нет в карте (T-034). */
  hasHome: boolean;
  /** Добавление узла — команда AddHomePage/AddScenario/AddForm через CommandBus. */
  onAddNode?: (kind: AddableNodeKind) => void;
  /** Добавление элемента в выделенный узел — команда AddElement/AddFormComponent. */
  onAddElement?: (kind: AddableElementKind) => void;
};

const useStyles = makeStyles<EditorTheme>((theme) => {
  const canvas = theme.editor.canvas;
  return {
    toolbar: {
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: canvas.controlsBackground,
      borderRadius: 24,
      padding: theme.spacing(0.5),
    },
    button: {
      color: canvas.controlsForeground,
      margin: theme.spacing(0.25),
      '&:hover': {
        backgroundColor: canvas.controlsHoverBackground,
      },
    },
    // Активная кнопка (открыто меню или панель) — тёмная подложка, как на макете.
    buttonActive: {
      backgroundColor: canvas.controlsHoverBackground,
    },
  };
});

const NODE_MENU_ITEMS: ReadonlyArray<{ kind: AddableNodeKind; label: string }> = [
  { kind: 'home', label: NODE_KIND_LABELS.home },
  { kind: 'subScenario', label: NODE_KIND_LABELS.subScenario },
  { kind: 'applicationForm', label: NODE_KIND_LABELS.form },
];

// Меню элементов (T-034): одинаково для любого выделенного узла — вид блока
// вид элемента не ограничивает [owner 2026-10-13, ADR-17]. Подписи — из
// маппинга адаптера: манифест схем хранит только machine-kind.
function elementMenuItems(
  selectedNodeType: CanvasNodeType | null,
  elementSchemas: readonly ElementSchema[],
): ReadonlyArray<{ kind: AddableElementKind; label: string }> {
  if (!selectedNodeType) {
    return [];
  }
  // Комментарий-элемент — отдельная кнопка тулбара, в меню его нет.
  return elementSchemas
    .filter((schema) => schema.kind !== 'comment')
    .map((schema) => ({ kind: schema.kind, label: ELEMENT_KIND_LABELS[schema.kind] }));
}

// Левый вертикальный тулбар (T-021): ровно 4 IconButton с active-состоянием
// (пятая иконка AI-ассистента удалена решением владельца). Кнопки 1–2 открывают
// меню добавления (узлы / элементы выбранного узла), кнопка 3 («код») сразу
// добавляет комментарий-элемент для разработчика [owner 2026-10-15], кнопка 4
// переключает панель-заглушку. Иконки — только из flamingo-icons, самописных нет.
export function EditorToolbar({
  elementSchemas,
  activePanel,
  onPanelChange,
  selectedNodeType,
  hasHome,
  onAddNode,
  onAddElement,
}: EditorToolbarProps) {
  const classes = useStyles();
  const [nodeMenuAnchor, setNodeMenuAnchor] = useState<HTMLElement | null>(null);
  const [elementMenuAnchor, setElementMenuAnchor] = useState<HTMLElement | null>(null);

  const buttonClass = (active: boolean) =>
    active ? `${classes.button} ${classes.buttonActive}` : classes.button;

  // Без выделенного узла элементу некуда попасть — кнопка меню отключена.
  const elementItems = elementMenuItems(selectedNodeType, elementSchemas);

  return (
    <Box className={classes.toolbar} data-testid="editor-toolbar">
      <IconButton
        className={buttonClass(nodeMenuAnchor !== null)}
        size="small"
        aria-label="Добавить узел"
        aria-pressed={nodeMenuAnchor !== null}
        onClick={(event) => setNodeMenuAnchor(event.currentTarget)}
      >
        <ViewColumn fontSize="small" />
      </IconButton>
      <IconButton
        className={buttonClass(elementMenuAnchor !== null)}
        size="small"
        aria-label="Добавить элемент"
        aria-pressed={elementMenuAnchor !== null}
        disabled={selectedNodeType === null}
        onClick={(event) => setElementMenuAnchor(event.currentTarget)}
      >
        <NoteAdd fontSize="small" />
      </IconButton>
      <IconButton
        className={classes.button}
        size="small"
        aria-label="Добавить комментарий"
        disabled={selectedNodeType === null}
        onClick={() => onAddElement?.('comment')}
      >
        <Code fontSize="small" />
      </IconButton>
      <IconButton
        className={buttonClass(activePanel === 'navigation')}
        size="small"
        aria-label="Навигация"
        aria-pressed={activePanel === 'navigation'}
        onClick={() => onPanelChange(activePanel === 'navigation' ? null : 'navigation')}
      >
        <AccountTree fontSize="small" />
      </IconButton>

      <Menu
        anchorEl={nodeMenuAnchor}
        open={nodeMenuAnchor !== null}
        onClose={() => setNodeMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {NODE_MENU_ITEMS.map((item) => (
          <MenuItem
            key={item.kind}
            disabled={item.kind === 'home' && hasHome}
            onClick={() => {
              setNodeMenuAnchor(null);
              onAddNode?.(item.kind);
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={elementMenuAnchor}
        open={elementMenuAnchor !== null}
        onClose={() => setElementMenuAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {elementItems.map((item) => (
          <MenuItem
            key={item.kind}
            onClick={() => {
              setElementMenuAnchor(null);
              onAddElement?.(item.kind);
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
