import { memo, useRef, type CSSProperties } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Chip, makeStyles } from '@blueprint-vendor/flamingo-core';
import { ShowChart, Visibility } from '@blueprint-vendor/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { logicAnchorHandleId, logicTargetHandleId, type CanvasElementData } from '../graph-flow-adapter';
import { FORM_STEP_LAYOUT } from '../canvas-layout';
import { setScaledDragPreview } from '../drag-preview';
import { endElementDrag, writeElementDrag } from '../element-dnd';
import { isActionTarget } from '../canvas-events';
import { ViolationBadge } from './violation-badge';
import { useCanvasActions, useCanvasInteraction } from '../canvas-interaction';
import { useHighlightStyles } from '../highlight/highlight-styles';
import { useEntityHighlight } from '../highlight/use-entity-highlight';
import { TargetHandle } from './target-handle';

// TEMPORARY (R-PERF-10, [owner 2026-10-22]): карточка элемента — div + классы,
// а не Card/CardContent/Typography/Chip ДС: на стенде ~1100 карточек, и 4
// компонента MUI на каждую были основной ценой рендера и размера DOM. Вид —
// тот же, токены — из темы. Сравнить с карточкой Flamingo замером на стенде
// (scripts/agent/perf-bench.mjs, docs/refactoring/R-PERF-canvas.md §4c);
// реестр — docs/temporary-registry.md.
const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    // Как Card variant="outlined": фон бумаги и рамка 1px.
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.editor.canvas.elementBorder}`,
    borderRadius: theme.editor.shape.card,
    color: theme.palette.text.primary,
    // Handle позиционируется относительно карточки элемента (D9); handle на
    // границе не обрезается (N7/N11).
    position: 'relative',
    overflow: 'visible',
  },
  content: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
  },
  title: {
    ...theme.typography.body2,
  },
  caption: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
  },
  // Ярлык (как Chip size="small"): тип элемента, «скрыт», адресат комментария.
  chip: {
    ...theme.typography.body2,
    fontSize: theme.typography.pxToRem(13),
    display: 'inline-flex',
    alignItems: 'center',
    height: 24,
    padding: theme.spacing(0, 1),
    borderRadius: theme.editor.shape.chip,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.getContrastText(theme.palette.grey[300]),
  },
  chipAccent: {
    backgroundColor: theme.editor.chipAccent,
    color: theme.editor.chipAccentContrastText,
  },
  iconWrap: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: theme.editor.shape.icon,
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
  // Комментарий-элемент [owner 2026-10-15, макет «комментарий-элемент»]:
  // голубая карточка с текстом сверху и бейджем адресата внизу.
  commentCard: {
    backgroundColor: theme.editor.canvas.commentBackground,
    borderColor: theme.editor.canvas.commentBorder,
  },
  commentContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: theme.spacing(1.5),
    minHeight: FORM_STEP_LAYOUT.elementHeight,
    padding: theme.spacing(2),
  },
  commentText: {
    ...theme.typography.body2,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
  commentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.editor.canvas.commentBadgeBackground,
    color: theme.editor.canvas.commentBadgeForeground,
  },
  // Комментарий-часть элемента [макет «комментарий-часть элемента»]: подложка
  // под карточкой — верхние края прямые и скрыты за карточкой (она
  // position: relative и рисуется поверх), в скруглениях её нижних углов
  // виден голубой фон; скруглены только нижние углы подложки.
  note: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1.5),
    marginTop: -12,
    padding: theme.spacing(3, 2, 2),
    border: `1px solid ${theme.editor.canvas.commentBorder}`,
    borderTop: 'none',
    borderRadius: `0 0 ${theme.editor.shape.card}px ${theme.editor.shape.card}px`,
    backgroundColor: theme.editor.canvas.commentBackground,
  },
}));

// Якорь входа рёбер правил: нулевой размер — ребро упирается ровно в край
// карточки, а не за полширины handle до неё [owner 2026-10-13]. Inline-стиль
// перебивает scoped-стили handles; константа — без нового объекта на рендер (R-PERF-8).
const LOGIC_ANCHOR_STYLE: CSSProperties = {
  top: FORM_STEP_LAYOUT.logicHandleTop,
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  opacity: 0,
  pointerEvents: 'none',
};

export type ElementCardProps = {
  element: CanvasElementData;
};

// Строка-элемент внутри узла (T-031, макет «пример-подсценариев-с-элементами»):
// иконка, основной/дополнительный текст, чипы типа и «Сложной логики».
// Source-handle навигационной связи — на правом краю карточки (D9): ребро
// начинается от элемента, не от узла. Target-handle правил видимости — на
// левом краю (T-037), только у компонентов форм (logicTarget, N5). Карточка
// draggable — dnd элементов (N2): перенос между узлами/шагами и порядок.
// memo + подписка по селектору (ревью P3, R2): выделение другой карточки
// перерисовывает только две карточки — прежнюю и новую выделенную.
// Обёртки в узлах и карточках — div с классами makeStyles, не Box: Box
// MUI v4 вставляет свой <style> на каждый экземпляр (7 тыс. тегов и ~10 с
// загрузки стенда, R2).
export const ElementCard = memo(function ElementCard({ element }: ElementCardProps) {
  const classes = useStyles();
  const actions = useCanvasActions();
  const highlightClasses = useHighlightStyles();
  // Подсветка — единый механизм (R-PERF-6): выделение (F7), ошибка (T-043), цель связи.
  const highlight = useEntityHighlight({ entity: 'card', id: element.id });
  const violations = useCanvasInteraction((state) => state.violations.elements.get(element.id));
  // Нажатие пришлось на коннектор/кнопку: нативный dnd карточки (N2) не
  // начинается — иначе браузер забирал жест протягивания связи у source-handle
  // и линия «залипала» после отмены dnd (повторная приёмка, 5.2).
  const pressOnActionRef = useRef(false);
  const isComment = element.commentAudience !== undefined;

  return (
    // Клик выделяет элемент (единое правило F5/F7: выделение + Delete).
    // stopPropagation: иначе клик дошёл бы до узла, и react-flow выделил бы
    // его вместо элемента. data-element-card — якорь для drop-зон dnd (N2).
    // Корень — div: комментарий-часть элемента (note) висит под карточкой и
    // тащится/выделяется вместе с ней; без note раскладка прежняя.
    <div
      // nodrag: нажатие на карточке не начинает drag узла react-flow —
      // иначе тащился весь блок, а нативный dnd карточки не стартовал.
      className="nodrag"
      data-testid={`element-card-${element.id}`}
      data-element-card={element.id}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        if (pressOnActionRef.current) {
          event.preventDefault();
          return;
        }
        writeElementDrag(event.dataTransfer, { elementId: element.id });
        // Превью в масштабе канваса, не в 100% (доводка N2).
        setScaledDragPreview(event);
      }}
      onDragEnd={endElementDrag}
      // Выделение — по нажатию (без «лага» click); коннектор и кнопки
      // выделение не меняют (баг 2). click гасится, чтобы не дойти до узла.
      // Выделение — следующей макрозадачей (ADR-16/17, доводка dnd): синхронный
      // ре-рендер узла внутри pointerdown срывал старт нативного drag в
      // Chromium — карточку, не выделенную заранее, нельзя было перетащить.
      onPointerDown={(event) => {
        pressOnActionRef.current = isActionTarget(event.target);
        if (!pressOnActionRef.current) {
          setTimeout(() => actions?.selectElement(element.id), 0);
        }
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className={[classes.card, isComment ? classes.commentCard : '', highlightClasses.card].join(' ')}
        data-highlight={highlight ?? undefined}
      >
        {/* Цель правил «Сложной логики» (T-037): рёбра видимости приходят
          на левый край карточки элемента, не шага и не формы. Только у
          компонентов форм (N5); невидим, накрывает карточку и принимает связь, только пока
          тянется правило и элемент — допустимая цель (повторная приёмка). */}
        {element.logicTarget ? (
          <TargetHandle entity="card" id={element.id} handleId={logicTargetHandleId(element.id)} />
        ) : null}
        {/* Якорь входа рёбер правил [owner 2026-10-13]: на высоте варианта-
          источника (logicHandleTop) — ребро идёт прямой горизонталью. Только
          отрисовка: невидим и связь не принимает. */}
        {element.logicTarget && element.hasIncomingLogic ? (
          <Handle
            type="target"
            position={Position.Left}
            id={logicAnchorHandleId(element.id)}
            isConnectable={false}
            style={LOGIC_ANCHOR_STYLE}
          />
        ) : null}
        {isComment ? (
          <div className={classes.commentContent}>
            <div className={classes.commentText}>{element.title}</div>
            <span className={`${classes.chip} ${classes.commentBadge}`}>{element.commentAudience}</span>
          </div>
        ) : (
          <div className={classes.content}>
            <div className={classes.iconWrap}>
              {/* Иконки элементов платформы придут с пакетом element-schemas;
              пока — единый плейсхолдер из дизайн-системы. */}
              <ShowChart fontSize="small" />
            </div>
            <div className={classes.texts}>
              <div className={classes.title}>{element.title}</div>
              {element.secondaryText ? <div className={classes.caption}>{element.secondaryText}</div> : null}
              <div className={classes.chips}>
                <span className={`${classes.chip} ${classes.chipAccent}`}>{element.kindLabel}</span>
                {element.complexLogic ? (
                  <Chip
                    className={classes.logicChip}
                    size="small"
                    color={element.complexLogic.enabled ? 'primary' : 'default'}
                    label="Сложная логика"
                    onClick={(event) => {
                      event.stopPropagation();
                      actions?.toggleComplexLogic(element.id);
                    }}
                  />
                ) : null}
                {/* Демонстрация семантики видимости (T-062): цель правил скрыта
                по умолчанию (L3) — до появления /preview это видно бейджем. */}
                {element.hiddenByLogic ? <span className={classes.chip}>Скрыт в предпросмотре</span> : null}
                {/* Индикатор «элемент кому-то подчинён» (L-Q1): виден даже при
                выключенной логике у источника. */}
                {violations ? <ViolationBadge messages={violations} /> : null}
                {element.hasIncomingLogic ? (
                  <Visibility className={classes.dependencyIcon} fontSize="small" />
                ) : null}
              </div>
            </div>
          </div>
        )}
        {/* Комментарий-элемент вне связей: ни источника, ни цели. */}
        {isComment ? null : <Handle type="source" position={Position.Right} id={element.id} />}
      </div>
      {element.note ? (
        <div className={classes.note} data-testid={`element-note-${element.id}`}>
          <div className={classes.commentText}>{element.note.text}</div>
          <span className={`${classes.chip} ${classes.commentBadge}`}>{element.note.audience}</span>
        </div>
      ) : null}
    </div>
  );
});
