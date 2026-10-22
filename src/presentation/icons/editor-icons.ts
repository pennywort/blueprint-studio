import type { ComponentType } from 'react';
import type { SvgIconProps } from '@material-ui/core';
import {
  AccountTree,
  Add,
  Code,
  Delete,
  ErrorOutline,
  Map as MapIcon,
  NoteAdd,
  PanTool,
  Redo,
  Search,
  ShowChart,
  Undo,
  ViewColumn,
  Visibility,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
} from '@material-ui/icons';
// Локальное переопределение иконок (файл вне git, напр. flamingo-icons на рабочей
// машине) — docs/local-overrides.md. Без файла алиас ведёт на пустую заглушку.
import localIcons from '@local/editor-icons';

// Иконки редактора — одна таблица «роль → компонент» [owner 2026-10-22]:
// код берёт иконку по роли, смена набора = правка таблицы, а не всех экранов.
export type EditorIconRole =
  | 'add'
  | 'delete'
  | 'search'
  | 'undo'
  | 'redo'
  | 'zoomIn'
  | 'zoomOut'
  | 'fitView'
  | 'minimap'
  | 'panTool'
  | 'addNode'
  | 'addElement'
  | 'addComment'
  | 'structurePanel'
  | 'elementPlaceholder'
  | 'visibilityDependency'
  | 'violation';

export type EditorIcon = ComponentType<SvgIconProps>;
export type EditorIconOverrides = Partial<Record<EditorIconRole, EditorIcon>>;

const muiIcons: Record<EditorIconRole, EditorIcon> = {
  add: Add,
  delete: Delete,
  search: Search,
  undo: Undo,
  redo: Redo,
  zoomIn: ZoomIn,
  zoomOut: ZoomOut,
  fitView: ZoomOutMap,
  minimap: MapIcon,
  panTool: PanTool,
  // T-021: кнопки левого тулбара — меню узлов (колонки, D7), меню элементов, комментарий, панель.
  addNode: ViewColumn,
  addElement: NoteAdd,
  addComment: Code,
  structurePanel: AccountTree,
  // T-031: плейсхолдер карточки элемента; T-037: зависимость видимости.
  elementPlaceholder: ShowChart,
  visibilityDependency: Visibility,
  violation: ErrorOutline,
};

export const editorIcons: Record<EditorIconRole, EditorIcon> = { ...muiIcons, ...localIcons };
