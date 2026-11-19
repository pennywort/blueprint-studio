import { useState, type ReactNode } from 'react';
import { Switch, Typography, makeStyles } from '@material-ui/core';
import type { ElementAttribute } from '@application/ports/element-schema-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Поле под переключателем [owner 2026-11-19]: любой атрибут с `toggle` в
// политике (editor-policy.json) — композиция поверх его редактора, а не новый
// редактор (§4a). Включён — у атрибута есть значение или поле раскрыто
// пользователем; выключение снимает значение (onClear → UpdateElementProps).
// Раскрытое пустое поле — только вид панели: в карте значения нет, как и у
// выключенного (§4b, схема и экспорт не меняются).

const useStyles = makeStyles<EditorTheme>((theme) => ({
  gate: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
  },
  // Как у BoolPropertyEditor: подпись слева, switch справа.
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    minHeight: 40,
  },
}));

export type ToggleGateProps = {
  attribute: Pick<ElementAttribute, 'label'>;
  /** У атрибута есть значение — переключатель включён. */
  hasValue: boolean;
  /** Выключение: снять значение атрибута. */
  onClear: () => void;
  /** Редактор атрибута без своей подписи. */
  children: ReactNode;
};

export function ToggleGate({ attribute, hasValue, onClear, children }: ToggleGateProps) {
  const classes = useStyles();
  // Начально раскрыто, если значение есть: снятие последнего варианта не прячет поле.
  const [opened, setOpened] = useState(hasValue);
  const checked = hasValue || opened;
  const onToggle = (next: boolean) => {
    setOpened(next);
    if (!next && hasValue) {
      onClear();
    }
  };
  return (
    <div className={classes.gate} data-testid="toggle-gate">
      <div className={classes.row}>
        <Typography variant="body2">{attribute.label}</Typography>
        <Switch
          checked={checked}
          inputProps={{ 'aria-label': attribute.label }}
          onChange={(event) => onToggle(event.target.checked)}
        />
      </div>
      {checked ? children : null}
    </div>
  );
}
