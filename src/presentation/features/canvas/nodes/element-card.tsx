import { Handle, Position } from '@xyflow/react';
import { Box, Card, CardContent, Chip, Typography, makeStyles } from '@sber-friend/flamingo-core';
import { ShowChart } from '@sber-friend/flamingo-icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import type { CanvasElementData } from '../graph-flow-adapter';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  card: {
    borderRadius: 12,
    borderColor: theme.editor.canvas.elementBorder,
    boxShadow: 'none',
    // Handle позиционируется относительно карточки элемента (D9).
    position: 'relative',
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
  chip: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing(1),
  },
}));

export type ElementCardProps = {
  element: CanvasElementData;
};

// Строка-элемент внутри узла (T-031, макет «пример-подсценариев-с-элементами»):
// иконка, основной/дополнительный текст, чип типа. Source-handle связи —
// на правом краю карточки (D9): ребро начинается от элемента, не от узла.
export function ElementCard({ element }: ElementCardProps) {
  const classes = useStyles();

  return (
    <Card className={classes.card} variant="outlined" data-testid={`element-card-${element.id}`}>
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
          <Chip className={classes.chip} size="small" color="secondary" label={element.kindLabel} />
        </Box>
      </CardContent>
      <Handle type="source" position={Position.Right} id={element.id} />
    </Card>
  );
}
