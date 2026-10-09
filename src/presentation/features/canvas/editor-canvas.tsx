import { useState } from 'react';
import { Background, BackgroundVariant, MiniMap, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorTheme } from '@presentation/theme/editor-theme';
import { useReactFlowThemeStyles } from './react-flow-theme-styles';
import { EditorCanvasControls } from './editor-canvas-controls';

export type EditorCanvasProps = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
};

// Холст редактора поверх @xyflow/react (ADR-03). Граф и узлы появятся в
// T-030/T-031; здесь — тема, фон, миникарта и нижние контролы (T-011).
function CanvasInner({ canUndo, canRedo, onUndo, onRedo }: EditorCanvasProps) {
  const theme = useEditorTheme();
  const styles = useReactFlowThemeStyles();
  // По макетам миникарта выключена по умолчанию, включается кнопкой панели.
  const [miniMapVisible, setMiniMapVisible] = useState(false);
  const canvas = theme.editor.canvas;

  return (
    <div className={styles.root} data-testid="editor-canvas">
      <ReactFlow nodes={[]} edges={[]} colorMode="light">
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={canvas.dots}
          bgColor={canvas.background}
        />
        {miniMapVisible ? (
          <MiniMap
            pannable
            zoomable
            bgColor={canvas.minimapBackground}
            nodeColor={canvas.minimapNode}
            maskColor={canvas.minimapMask}
          />
        ) : null}
        <EditorCanvasControls
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={onUndo}
          onRedo={onRedo}
          miniMapVisible={miniMapVisible}
          onToggleMiniMap={() => setMiniMapVisible((visible) => !visible)}
        />
      </ReactFlow>
    </div>
  );
}

export function EditorCanvas(props: EditorCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
