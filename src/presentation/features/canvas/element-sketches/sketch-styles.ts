import { makeStyles } from '@material-ui/core';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Общие классы набросков (element-sketches, [owner 2026-11-05]): один статичный
// лист makeStyles без props — стили не пересчитываются на рендер, карточек на
// стенде ~1100 (R-PERF-10). Контролы нарисованы div'ами и CSS (рамка, круг,
// треугольник), а не SVG/MUI-компонентами — дешевле по DOM и рендеру.
export const useSketchStyles = makeStyles<EditorTheme>((theme) => ({
  // Иконка + тексты; лишнее обрезается — высота карточки фиксирована.
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1.5),
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
  texts: {
    flexGrow: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  },
  title: {
    ...theme.typography.body2,
    overflowWrap: 'anywhere',
  },
  caption: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
    overflowWrap: 'anywhere',
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
  // Аватар list-item (leftAtom type: avatar): круг с инициалами или иконкой.
  avatar: {
    borderRadius: '50%',
    ...theme.typography.caption,
    fontWeight: 600,
  },
  // Правый атом list-item: маркер справа (иконка, кнопка, dropdown…).
  trailing: {
    flexShrink: 0,
    alignSelf: 'center',
    color: theme.palette.text.secondary,
    ...theme.typography.caption,
  },
  // Шеврон «>» правого атома — CSS-уголок, без SVG.
  chevron: {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRight: `${theme.editor.stroke.selected}px solid currentColor`,
    borderTop: `${theme.editor.stroke.selected}px solid currentColor`,
    transform: 'rotate(45deg)',
  },
  // Поле ввода: подпись над рамкой, подсказка внутри.
  field: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    height: 40,
    flexShrink: 0,
    padding: theme.spacing(0, 1.5),
    border: `${theme.editor.stroke.outline}px solid ${theme.editor.canvas.elementBorder}`,
    borderRadius: theme.editor.shape.small,
    boxSizing: 'border-box',
    color: theme.palette.text.secondary,
    ...theme.typography.caption,
  },
  fieldText: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Стрелка выпадающего списка — CSS-треугольник.
  caret: {
    flexShrink: 0,
    width: 0,
    height: 0,
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderTop: '5px solid currentColor',
  },
  // Кнопка-пилюля.
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: theme.spacing(1),
    maxWidth: '100%',
    height: 36,
    padding: theme.spacing(0, 2),
    borderRadius: theme.editor.shape.pill,
    boxSizing: 'border-box',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    ...theme.typography.body2,
  },
  buttonContained: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  buttonSecondary: {
    backgroundColor: theme.editor.secondaryButtonBackground,
    color: theme.palette.text.primary,
  },
  buttonText: {
    padding: 0,
    color: theme.palette.text.primary,
    textDecoration: 'underline',
  },
  // Флажок / переключатель: квадрат или круг рамкой.
  choice: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minWidth: 0,
    ...theme.typography.body2,
  },
  box: {
    flexShrink: 0,
    width: 16,
    height: 16,
    border: `${theme.editor.stroke.selected}px solid ${theme.palette.text.secondary}`,
    borderRadius: theme.editor.shape.small / 2,
    boxSizing: 'border-box',
  },
  circle: {
    borderRadius: '50%',
  },
  choiceText: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Информационный блок: плашка с акцентной полосой слева.
  alert: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'hidden',
    padding: theme.spacing(1.5),
    borderRadius: theme.editor.shape.card,
    borderLeft: `${theme.spacing(0.5)}px solid currentColor`,
    boxSizing: 'border-box',
    ...theme.typography.body2,
    overflowWrap: 'anywhere',
  },
  alertText: {
    color: theme.palette.text.primary,
  },
  alertInfo: { color: theme.palette.info.main, backgroundColor: theme.editor.canvas.commentBackground },
  alertWarning: { color: theme.palette.warning.main, backgroundColor: theme.palette.grey[100] },
  alertSuccess: { color: theme.palette.success.main, backgroundColor: theme.palette.grey[100] },
  alertDanger: { color: theme.palette.error.main, backgroundColor: theme.palette.grey[100] },
  // Типографика: текст крупнее/мельче по variant.
  typoHeading: {
    ...theme.typography.h6,
    overflowWrap: 'anywhere',
  },
  typoBody: {
    ...theme.typography.body2,
    overflowWrap: 'anywhere',
  },
  typoCaption: {
    ...theme.typography.caption,
    color: theme.palette.text.secondary,
    overflowWrap: 'anywhere',
  },
}));

export type SketchClasses = ReturnType<typeof useSketchStyles>;
