import { Handle, Position, useConnection, useNodeId } from '@xyflow/react';
import { Box, Card, CardContent, Chip, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { ShowChart, Visibility } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { logicTargetHandleId, parseLogicSourceHandle, type CanvasElementData } from '../graph-flow-adapter';
import { writeElementDrag } from '../element-dnd';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    borderRadius: 12,
    borderColor: theme.editor.canvas.elementBorder,
    boxShadow: 'none',
    // Handle позиционируется относительно карточки элемента (D9).
    position: 'relative',
  },
  // Выделение элемента (F7): чёрная рамка цвета стрелок — как у узлов и связей.
  cardSelected: {
    border: `2px solid ${theme.editor.canvas.edge}`,
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    '&:last-child': {
      paddingBottom: theme.spacing(2),
    },
  },
  iconWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.editor.canvas.controlsBackground,
    color: theme.palette.text.secondary,
  },
  texts: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
  // Чип-переключатель «Сложная логика» (T-037, L4): кликабелен; активный —
  // залитый, как на макете «сложная-логика-госб-…» (T-067 перенесёт
  // переключатель в инспектор, чип останется индикатором).
  logicChip: {
    cursor: 'pointer',
  },
  dependencyIcon: {
    color: theme.palette.text.secondary,
  },
  // Строки option'ов Select'а-источника при включённой «Сложной логике»:
  // у каждой — source-handle на правом краю (как у связей элемент →
  // подсценарий, T-032), из него протягивается правило видимости.
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
  },
  // Target-handle правил видимости (N9): в покое скрыт — в DOM остаётся,
  // чтобы react-flow измерил его и крепил к нему рёбра правил. Удвоенный
  // селектор перебивает общие стили handles из react-flow-theme-styles.
  logicTargetHidden: {
    '&&.react-flow__handle': {
      opacity: 0,
      pointerEvents: 'none',
    },
  },
  // Подсветка допустимой цели, пока тянется ребро из option'а источника.
  logicTargetArmed: {
    '&&.react-flow__handle': {
      width: 12,
      height: 12,
      backgroundColor: theme.editor.canvas.edgeActive,
      boxShadow: `0 0 0 4px ${theme.editor.canvas.nodeHoverBackground}`,
    },
  },
  optionRow: {
    position: 'relative',
    borderRadius: 8,
    backgroundColor: theme.editor.canvas.controlsBackground,
    padding: theme.spacing(0.5, 1),
  },
}));

export type ElementCardProps = {
  element: CanvasElementData;
};

// Строка-элемент внутри узла (T-031, макет «пример-подсценариев-с-элементами»):
// иконка, основной/дополнительный текст, чипы типа и «Сложной логики».
// Source-handle навигационной связи — на правом краю карточки (D9): ребро
// начинается от элемента, не от узла. Target-handle правил видимости — на
// левом краю (T-037), только у компонентов форм (logicTarget, N5). Карточка
// draggable — dnd элементов (N2): перенос между узлами/шагами и порядок.
export function ElementCard({ element }: ElementCardProps) {
  const classes = useStyles();
  const nodeId = useNodeId();
  // N9 [owner 2026-10-13]: принимающий handle «загорается» только пока из
  // option'а Select'а тянется ребро — у всех компонентов той же формы
  // (L-I5: форма = узел), кроме самого источника.
  const logicArmed = useConnection((connection) => {
    if (!connection.inProgress || connection.fromNode.id !== nodeId) {
      return false;
    }
    const source = parseLogicSourceHandle(connection.fromHandle.id ?? '');
    return source !== null && source.elementId !== element.id;
  });
  const logicHandleClass = logicArmed
    ? classes.logicTargetArmed
    : element.hasIncomingLogic
      ? undefined
      : classes.logicTargetHidden;

  return (
    // Клик выделяет элемент (единое правило F5/F7: выделение + Delete).
    // stopPropagation: иначе клик дошёл бы до узла, и react-flow выделил бы
    // его вместо элемента. data-element-card — якорь для drop-зон dnd (N2).
    <Card
      className={element.selected ? `${classes.card} ${classes.cardSelected}` : classes.card}
      variant="outlined"
      data-testid={`element-card-${element.id}`}
      data-element-card={element.id}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        writeElementDrag(event.dataTransfer, { elementId: element.id, kind: element.dndKind });
      }}
      onClick={(event) => {
        event.stopPropagation();
        element.onSelect?.();
      }}
    >
      {/* Цель правил «Сложной логики» (T-037): рёбра видимости приходят
          на левый край карточки элемента, не шага и не формы. Только у
          компонентов форм (N5); виден, пока тянется ребро правила или если
          у элемента уже есть входящее правило (N9). */}
      {element.logicTarget ? (
        <Handle
          type="target"
          position={Position.Left}
          id={logicTargetHandleId(element.id)}
          className={logicHandleClass}
        />
      ) : null}
      <CardContent className={classes.content}>
        <Box className={classes.iconWrap}>
          {/* Иконки элементов платформы придут с пакетом element-schemas;
              пока — единый плейсхолдер из дизайн-системы. */}
          <ShowChart fontSize="small" />
        </Box>
        <Box className={classes.texts}>
          <Typography variant="body2">{element.title}</Typography>
          {element.secondaryText ? (
            <Typography variant="caption" color="textSecondary">
              {element.secondaryText}
            </Typography>
          ) : null}
          <Box className={classes.chips}>
            <Chip size="small" color="secondary" label={element.kindLabel} />
            {element.complexLogic ? (
              <Chip
                className={classes.logicChip}
                size="small"
                color={element.complexLogic.enabled ? 'primary' : 'default'}
                label="Сложная логика"
                onClick={(event) => {
                  event.stopPropagation();
                  element.onToggleComplexLogic?.();
                }}
              />
            ) : null}
            {/* Демонстрация семантики видимости (T-062): цель правил скрыта
                по умолчанию (L3) — до появления /preview это видно бейджем. */}
            {element.hiddenByLogic ? (
              <Chip size="small" color="default" label="Скрыт в предпросмотре" />
            ) : null}
            {/* Индикатор «элемент кому-то подчинён» (L-Q1): виден даже при
                выключенной логике у источника. */}
            {element.hasIncomingLogic ? (
              <Visibility className={classes.dependencyIcon} fontSize="small" />
            ) : null}
          </Box>
          {element.complexLogic?.enabled && element.complexLogic.options.length > 0 ? (
            <Box className={classes.options}>
              {element.complexLogic.options.map((option) => (
                <Box className={classes.optionRow} key={option.handleId}>
                  <Typography variant="caption">{option.label}</Typography>
                  <Handle type="source" position={Position.Right} id={option.handleId} />
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
      </CardContent>
      <Handle type="source" position={Position.Right} id={element.id} />
    </Card>
  );
}
