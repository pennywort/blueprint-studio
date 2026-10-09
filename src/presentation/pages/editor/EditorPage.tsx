import { Box } from '@sber-friend/flamingo-core';
import { useContainer } from '@presentation/app/App';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { EditorCanvas } from '@presentation/features/canvas/editor-canvas';

// Страница редактора: тема на корне редактора (T-010, D6), далее — канвас
// со стилизованными под тему контролами (T-011). Полная компоновка каркаса
// (TopBar, тулбар, панель атрибутов) — задача T-022.
export function EditorPage() {
  const container = useContainer();
  const commandBus = container.cradle.commandBus;

  // Undo/redo берут доступность из стеков CommandBus; сами обработчики
  // появятся вместе с хранилищем графа в presentation (T-035+, эпик 003):
  // bus.undo(current) требует текущий граф, которого пока нет в состоянии UI.
  return (
    <EditorThemeProvider>
      <Box height="100vh" width="100%">
        <EditorCanvas canUndo={commandBus.canUndo()} canRedo={commandBus.canRedo()} />
      </Box>
    </EditorThemeProvider>
  );
}
