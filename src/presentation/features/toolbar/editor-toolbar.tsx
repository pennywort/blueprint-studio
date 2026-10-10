import { useState } from 'react';
import { Box, IconButton, Menu, MenuItem, makeStyles } from '@sber-friend/flamingo-core';
import { AccountTree, Code, NoteAdd, ViewColumn } from '@sber-friend/flamingo-icons';
import type { ElementSchema } from '@application/ports/element-schema-provider';
import type { FormComponentKind } from '@domain/model/form-components';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import {
  FORM_COMPONENT_KIND_LABELS,
  type CanvasNodeType,
} from '@presentation/features/canvas/graph-flow-adapter';

// Панели-заглушки кнопок 3–4: назначение не подтверждено владельцем (Q-1),
// поэтому панели только переключаются, содержимое не выдумываем.
export type EditorSidePanel = 'json' | 'navigation';

// Узлы из меню кнопки 1 (макет «меню-добавления-и-заглушка-пустого-проекта»).
export type AddableNodeKind = 'home' | 'subScenario' | 'applicationForm';

// Элемент из меню кнопки 2 (T-034): состав меню зависит от типа выделенного
// узла — Главная принимает List item/Widget card, Подсценарий — List item,
// Форма — компоненты формы из listSchemas() провайдера.
export type AddableElementKind = 'listItem' | 'widgetCard' | FormComponentKind;

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
  { kind: 'home', label: 'Главная' },
  { kind: 'subScenario', label: 'Подсценарий' },
  { kind: 'applicationForm', label: 'Форма заявки' },
];

// Состав меню элементов по типу выделенного узла (T-034). Человекочитаемые
// подписи форм-компонентов — из маппинга адаптера: манифест схем хранит
// только machine-kind, названия появятся, когда их начнёт отдавать провайдер.
function elementMenuItems(
  selectedNodeType: CanvasNodeType | null,
  elementSchemas: readonly ElementSchema[],
): ReadonlyArray<{ kind: AddableElementKind; label: string }> {
  if (selectedNodeType === 'home') {
    return [
      { kind: 'listItem', label: 'List item' },
      { kind: 'widgetCard', label: 'Widget card' },
    ];
  }
  if (selectedNodeType === 'subScenario') {
    return [{ kind: 'listItem', label: 'List item' }];
  }
  if (selectedNodeType === 'form') {
    return elementSchemas.map((schema) => ({
      kind: schema.kind,
      label: FORM_COMPONENT_KIND_LABELS[schema.kind],
    }));
  }
  return [];
}

// Левый вертикальный тулбар (T-021): ровно 4 IconButton с active-состоянием
// (пятая иконка AI-ассистента удалена решением владельца). Кнопки 1–2 открывают
// меню добавления (узлы / элементы выбранного узла), кнопки 3–4 переключают
// панели-заглушки. Иконки — только из flamingo-icons, самописных нет.
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
        className={buttonClass(activePanel === 'json')}
        size="small"
        aria-label="JSON"
        aria-pressed={activePanel === 'json'}
        onClick={() => onPanelChange(activePanel === 'json' ? null : 'json')}
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
