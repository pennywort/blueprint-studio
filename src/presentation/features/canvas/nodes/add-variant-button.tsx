import { memo } from 'react';
import { makeStyles } from '@material-ui/core';
import { editorIcons } from '@presentation/icons/editor-icons';
import { VARIANT_LABELS } from '@presentation/labels/editor-labels';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { useCanvasActions } from '../canvas-interaction';
import { FORM_STEP_LAYOUT } from '../canvas-layout';

// Кнопка «Значение» под вариантами элемента выбора [owner 2026-11-19, макет
// Selection list]: способ заполнения — вручную (domain/variant-source); новый
// вариант — та же команда UpdateElementProps, что у панели (undo из коробки).
const useStyles = makeStyles<EditorTheme>((theme) => ({
  button: {
    ...theme.typography.body2,
    fontWeight: 600,
    fontFamily: theme.typography.fontFamily,
    width: FORM_STEP_LAYOUT.elementWidth,
    height: FORM_STEP_LAYOUT.addVariantHeight,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    border: 'none',
    borderRadius: theme.editor.shape.chip,
    backgroundColor: theme.palette.grey[200],
    color: theme.palette.text.primary,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.grey[300],
    },
  },
}));

export const AddVariantButton = memo(function AddVariantButton({ elementId }: { elementId: string }) {
  const classes = useStyles();
  const actions = useCanvasActions();
  return (
    <button
      type="button"
      // nodrag/nokey: нажатие не тащит узел и не начинает рамку выделения.
      className={`${classes.button} nodrag nokey`}
      data-testid={`add-variant-${elementId}`}
      onClick={(event) => {
        event.stopPropagation();
        actions?.addElementVariant(elementId);
      }}
    >
      <editorIcons.add fontSize="small" />
      {VARIANT_LABELS.addOnCanvas}
    </button>
  );
});
