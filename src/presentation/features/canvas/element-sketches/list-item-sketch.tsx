import { IconStub } from '@presentation/features/attributes/icon-stub';
import type { ElementSketchProps } from './sketch-types';
import { objectOf, textOf } from './sketch-types';
import { useSketchStyles, type SketchClasses } from './sketch-styles';

// Набросок list-item [owner 2026-11-05]: левый атом (иконка или аватар), три
// строки текста и маркер правого атома. Атомы по схеме фреймворка — строка-
// иконка (shared/icon.schema.json) или объект { type: avatar|checkbox|radio|
// switch|button|dropdown… }; набросок показывает их условно, не настоящий вид.

const initials = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

function LeftAtom({ atom, classes }: { atom: unknown; classes: SketchClasses }) {
  if (typeof atom === 'string' && atom.length > 0) {
    return (
      <div className={classes.iconWrap}>
        <IconStub name={atom} />
      </div>
    );
  }
  const object = objectOf(atom);
  if (!object) return null;
  if (object.type === 'avatar') {
    const icon = typeof object.icon === 'string' && object.icon.length > 0 ? object.icon : undefined;
    const label = typeof object.label === 'string' ? object.label : '';
    return (
      <div className={`${classes.iconWrap} ${classes.avatar}`}>
        {icon ? <IconStub name={icon} /> : initials(label) || '?'}
      </div>
    );
  }
  if (object.type === 'checkbox' || object.type === 'radio' || object.type === 'switch') {
    return <span className={`${classes.box} ${object.type === 'checkbox' ? '' : classes.circle}`} />;
  }
  return null;
}

function RightAtom({ atom, classes }: { atom: unknown; classes: SketchClasses }) {
  if (atom === undefined || atom === null) return null;
  if (typeof atom === 'string') {
    return atom.length > 0 ? (
      <span className={classes.trailing}>
        <IconStub name={atom} />
      </span>
    ) : null;
  }
  const object = objectOf(atom);
  if (!object) return null;
  if (typeof object.label === 'string' && object.label.length > 0) {
    return <span className={classes.trailing}>{object.label}</span>;
  }
  if (typeof object.dateText === 'string') {
    return <span className={classes.trailing}>{object.dateText}</span>;
  }
  return (
    <span className={classes.trailing}>
      <span className={classes.chevron} />
    </span>
  );
}

export function ListItemSketch({ props, title }: ElementSketchProps) {
  const classes = useSketchStyles();
  const secondary = textOf(props, 'secondaryText');
  const tertiary = textOf(props, 'tertiaryText');
  return (
    <div className={classes.row}>
      <LeftAtom atom={props.leftAtom} classes={classes} />
      <div className={classes.texts}>
        <div className={classes.title}>{textOf(props, 'primaryText') ?? title}</div>
        {secondary ? <div className={classes.caption}>{secondary}</div> : null}
        {tertiary ? <div className={classes.caption}>{tertiary}</div> : null}
      </div>
      <RightAtom atom={props.rightAtom} classes={classes} />
    </div>
  );
}
