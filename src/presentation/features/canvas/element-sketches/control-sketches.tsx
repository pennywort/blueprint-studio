import { IconStub } from '@presentation/features/attributes/icon-stub';
import type { ElementSketchProps } from './sketch-types';
import { labelsOf, textOf } from './sketch-types';
import { useSketchStyles, type SketchClasses } from './sketch-styles';

// Простые наброски видов, чьё отличие очевидно из схемы [owner 2026-11-05]:
// поле ввода, список, флажок, переключатели, кнопка, информационный блок,
// типографика. Каждый читает из props только своё; варианты (variant/color) —
// таблицы «значение → класс», а не ветвления.

// Сколько вариантов списка/переключателей показать — набросок, не весь список.
const MAX_CHOICES = 3;

function Field({
  label,
  hint,
  caret,
  classes,
}: {
  label: string;
  hint?: string;
  caret?: boolean;
  classes: SketchClasses;
}) {
  return (
    <div className={classes.column}>
      <div className={classes.title}>{label}</div>
      <div className={classes.field}>
        <span className={classes.fieldText}>{hint ?? ''}</span>
        {caret ? <span className={classes.caret} /> : null}
      </div>
    </div>
  );
}

/** Текстовое поле, поле даты: подпись + рамка с подсказкой. */
export function FieldSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  return (
    <Field label={textOf(props, 'label') ?? title} hint={textOf(props, 'placeholder')} classes={classes} />
  );
}

/** Выпадающий список: поле со стрелкой. */
export function SelectSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  return (
    <Field
      label={textOf(props, 'label') ?? title}
      hint={textOf(props, 'placeholder') ?? labelsOf(props.options)[0]}
      caret
      classes={classes}
    />
  );
}

export function CheckboxSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  return (
    <div className={classes.column}>
      <div className={classes.choice}>
        <span className={classes.box} />
        <span className={classes.choiceText}>{textOf(props, 'label') ?? title}</span>
      </div>
    </div>
  );
}

/** Группа переключателей: подпись и первые варианты кружками. */
export function RadioGroupSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  const items = labelsOf(props.items).slice(0, MAX_CHOICES);
  return (
    <div className={classes.column}>
      <div className={classes.title}>{textOf(props, 'label') ?? title}</div>
      {(items.length > 0 ? items : ['']).map((item, index) => (
        <div key={index} className={classes.choice}>
          <span className={`${classes.box} ${classes.circle}`} />
          <span className={`${classes.choiceText} ${classes.caption}`}>{item}</span>
        </div>
      ))}
    </div>
  );
}

// variant/color кнопки → класс; значение вне таблицы — вторичная кнопка.
const BUTTON_CLASS: Readonly<Record<string, keyof SketchClasses>> = {
  'contained:primary': 'buttonContained',
  'contained:secondary': 'buttonSecondary',
  'contained:default': 'buttonSecondary',
  'text:primary': 'buttonText',
  'text:secondary': 'buttonText',
  'text:default': 'buttonText',
};

export function ButtonSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  const key = `${textOf(props, 'variant') ?? 'contained'}:${textOf(props, 'color') ?? 'secondary'}`;
  const icon = textOf(props, 'icon');
  return (
    <div className={classes.column}>
      <div className={`${classes.button} ${classes[BUTTON_CLASS[key] ?? 'buttonSecondary']}`}>
        {icon ? <IconStub name={icon} /> : null}
        {textOf(props, 'label') ?? title}
      </div>
    </div>
  );
}

const ALERT_CLASS: Readonly<Record<string, keyof SketchClasses>> = {
  info: 'alertInfo',
  warning: 'alertWarning',
  success: 'alertSuccess',
  danger: 'alertDanger',
};

export function AlertSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  const variant = ALERT_CLASS[textOf(props, 'variant') ?? 'info'] ?? 'alertInfo';
  return (
    <div className={`${classes.alert} ${classes[variant]}`}>
      <span className={classes.alertText}>{textOf(props, 'label') ?? title}</span>
    </div>
  );
}

const TYPOGRAPHY_CLASS: Readonly<Record<string, keyof SketchClasses>> = {
  h1: 'typoHeading',
  h2: 'typoHeading',
  h3: 'typoHeading',
  h4: 'typoHeading',
  body1: 'typoBody',
  body2: 'typoBody',
  caption1: 'typoCaption',
};

export function TypographySketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  const variant = TYPOGRAPHY_CLASS[textOf(props, 'variant') ?? 'body1'] ?? 'typoBody';
  return (
    <div className={classes.column}>
      <div className={classes[variant]}>{textOf(props, 'label') ?? title}</div>
    </div>
  );
}
