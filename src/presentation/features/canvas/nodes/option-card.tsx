import { Handle, Position } from '@xyflow/react';
import { Box, Card, Chip, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { isActionTarget } from '../canvas-events';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    borderRadius: 12,
    borderColor: theme.editor.canvas.elementBorder,
    boxShadow: 'none',
    // Source-handle на правом краю карточки — не обрезать (N7/N11).
    position: 'relative',
    overflow: 'visible',
    transition: 'none',
    padding: theme.spacing(1.5, 2),
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  },
}));

export type OptionCardProps = {
  option: { handleId: string; label: string; value: string; isDefault: boolean };
  /** Нажатие выделяет Select-владелец (вариант — его часть, не отдельный элемент). */
  onSelect?: () => void;
};

// Вариант Select'а со «Сложной логикой» — отдельная карточка под Select'ом
// в той же колонке шага [owner 2026-10-13; макеты «layouting …»]: из неё
// тянется правило видимости (source-handle справа), цель встаёт напротив.
// TEMPORARY: макет покажут заказчику — вид «оторванных» от Select'а вариантов
// может измениться (PROJECT_STATE, ADR-16).
export function OptionCard({ option, onSelect }: OptionCardProps) {
  const classes = useStyles();
  return (
    <Card
      className={classes.card}
      variant="outlined"
      data-testid={`option-card-${option.handleId}`}
      onPointerDown={(event) => {
        if (!isActionTarget(event.target)) {
          onSelect?.();
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Typography variant="body2">{option.label}</Typography>
      <Box className={classes.chips}>
        <Chip size="small" color="secondary" label={option.value} />
        {option.isDefault ? <Chip size="small" label="Предвыбор" /> : null}
      </Box>
      <Handle type="source" position={Position.Right} id={option.handleId} />
    </Card>
  );
}
