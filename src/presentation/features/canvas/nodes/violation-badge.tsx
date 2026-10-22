import { Tooltip, makeStyles } from '@material-ui/core';
import { ErrorOutline } from '@material-ui/icons';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  icon: {
    color: theme.palette.error.main,
    flexShrink: 0,
  },
  // В шапке узла (flex space-between) значок прижимается к корзине.
  inHeader: {
    marginLeft: 'auto',
    alignSelf: 'center',
  },
  list: {
    margin: 0,
    paddingLeft: theme.spacing(2),
  },
}));

// Значок нарушения инвариантов (T-043): иконка ошибки + тултип со списком
// message'ей. Общий для узлов и карточек элементов.
export function ViolationBadge({ messages, inHeader }: { messages: readonly string[]; inHeader?: boolean }) {
  const classes = useStyles();
  return (
    <Tooltip
      title={
        <ul className={classes.list}>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      }
    >
      <ErrorOutline
        className={inHeader ? `${classes.icon} ${classes.inHeader}` : classes.icon}
        fontSize="small"
        data-testid="violation-badge"
      />
    </Tooltip>
  );
}
