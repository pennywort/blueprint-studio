import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { makeStyles } from '@material-ui/core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { VARIANT_LABELS, variantNumberLabel } from '@presentation/labels/editor-labels';
import { isActionTarget } from '../canvas-events';
import { useCanvasActions } from '../canvas-interaction';
import { FORM_STEP_LAYOUT } from '../canvas-layout';

// Вид — макет Selection list [owner 2026-11-19]: карточка во всю ширину
// элемента, подпись сверху, номер значения чипом снизу; высота фиксирована —
// раскладка шага считает её по FORM_STEP_LAYOUT.optionHeight.
const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    backgroundColor: theme.palette.background.paper,
    border: `${theme.editor.stroke.outline}px solid ${theme.editor.canvas.elementBorder}`,
    borderRadius: theme.editor.shape.element,
    color: theme.palette.text.primary,
    // Source-handle на правом краю карточки — не обрезать (N7/N11).
    position: 'relative',
    overflow: 'visible',
    width: FORM_STEP_LAYOUT.elementWidth,
    height: FORM_STEP_LAYOUT.optionHeight,
    boxSizing: 'border-box',
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
  },
  label: {
    ...theme.typography.body2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  },
  // Как чипы карточки элемента: высота 16px.
  chip: {
    ...theme.typography.caption,
    fontSize: theme.typography.pxToRem(11),
    lineHeight: '16px',
    height: 16,
    padding: theme.spacing(0, 0.75),
    borderRadius: theme.editor.shape.chip,
    whiteSpace: 'nowrap',
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.getContrastText(theme.palette.grey[300]),
  },
  chipNumber: {
    backgroundColor: theme.palette.grey[700],
    color: theme.palette.getContrastText(theme.palette.grey[700]),
  },
}));

export type OptionCardProps = {
  option: { handleId: string; label: string; value: string; isDefault: boolean };
  /** Номер значения с 1 — чип «Значение N». */
  index: number;
  /** Select-владелец: нажатие выделяет его (вариант — часть Select'а, не отдельный элемент). */
  elementId: string;
};

// Вариант Select'а — отдельная карточка под Select'ом: в шаге формы — в той
// же колонке шага [owner 2026-10-13; макеты «layouting …»], на странице с
// логикой (R-CFG-2) — под карточкой в списке. Из неё
// тянется правило видимости (при «Сложной логике»; цель встаёт напротив) или
// переход на следующий шаг [owner 2026-10-14] — source-handle справа.
// TEMPORARY: макет покажут заказчику — вид «оторванных» от Select'а вариантов
// может измениться (PROJECT_STATE, ADR-16).
// memo + действие из контекста (R-PERF-10): пропсы стабильны, вариант не
// перерисовывается вместе с узлом.
export const OptionCard = memo(function OptionCard({ option, index, elementId }: OptionCardProps) {
  const classes = useStyles();
  const actions = useCanvasActions();
  return (
    <div
      // nodrag: нажатие на варианте не начинает drag узла react-flow — иначе
      // тащился весь блок формы (доводка dnd, ADR-16). Сам вариант не
      // переносится: он часть Select'а. nokey — Shift+клик доходит до
      // варианта, а не начинает рамку выделения react-flow (как у карточки).
      className={`${classes.card} nodrag nokey`}
      data-testid={`option-card-${option.handleId}`}
      // Метка для полотна: нажатие выделяет Select, а не узел/шаг [owner 2026-10-16].
      data-option-card={option.handleId}
      onPointerDown={(event) => {
        if (!isActionTarget(event.target)) {
          actions?.selectElement(elementId, event.shiftKey ? 'toggle' : 'only');
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={classes.label}>{option.label}</div>
      {/* value варианта — служебный id (генерируется панелью, на него ссылаются
          правила L5 и переходы), на карточке — номер значения [owner 2026-11-19]. */}
      <div className={classes.chips}>
        <span className={`${classes.chip} ${classes.chipNumber}`}>{variantNumberLabel(index)}</span>
        {option.isDefault ? <span className={classes.chip}>{VARIANT_LABELS.isDefault}</span> : null}
      </div>
      {/* Выход ребра — на высоте якоря цели (logicHandleTop), не по центру карточки. */}
      <Handle
        type="source"
        position={Position.Right}
        id={option.handleId}
        style={{ top: FORM_STEP_LAYOUT.logicHandleTop }}
      />
    </div>
  );
});
