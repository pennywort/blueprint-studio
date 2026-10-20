import type { ReactNode } from 'react';
import { Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import type { ElementAttribute } from '@application/ports/element-schema-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';

// Каркас поля панели атрибутов по макетам docs/design-mockups/настройка-атрибутов-*
// (T-041): подпись над полем (а не плавающий label MUI — он наезжал на
// соседние поля), «*» у обязательного, подсказка под полем. Один каркас на все
// редакторы — отступы и типографика задаются здесь, а не в каждом редакторе.

const useStyles = makeStyles<EditorTheme>((theme) => ({
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    minWidth: 0,
  },
  label: {
    color: theme.palette.text.secondary,
  },
  heading: {
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
  },
  required: {
    color: theme.palette.error.main,
  },
  helper: {
    color: theme.palette.text.secondary,
  },
}));

export type AttributeFieldProps = {
  attribute: Pick<ElementAttribute, 'label' | 'required' | 'helperText'>;
  /** heading — подпись заголовком блока (иконки, варианты), как секция в макете. */
  variant?: 'caption' | 'heading';
  children: ReactNode;
};

export function AttributeField({ attribute, variant = 'caption', children }: AttributeFieldProps) {
  const classes = useStyles();
  return (
    <div className={classes.field}>
      <Typography
        component="label"
        variant={variant === 'heading' ? 'subtitle1' : 'caption'}
        className={variant === 'heading' ? classes.heading : classes.label}
      >
        {attribute.label}
        {attribute.required ? <span className={classes.required}>*</span> : null}
      </Typography>
      {children}
      {attribute.helperText ? (
        <Typography variant="caption" className={classes.helper}>
          {attribute.helperText}
        </Typography>
      ) : null}
    </div>
  );
}
