import { Button, Typography, makeStyles } from '@material-ui/core';
import { useNavigate } from 'react-router-dom';
import { SettingsOverview } from '@presentation/features/settings/settings-overview';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  root: {
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(4),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
}));

// Скрытая панель настроек (R-ADM-4): роут #/settings, ссылки в интерфейсе нет.
// Пока только просмотр — запись появится с R-ADM-3 (бэкенд) и вкладкой «Мои».
function Settings() {
  const classes = useStyles();
  const navigate = useNavigate();
  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h4">Настройки редактора</Typography>
        <Button variant="outlined" onClick={() => navigate('/')}>
          К проектам
        </Button>
      </div>
      <Typography variant="body2" color="textSecondary">
        Только просмотр: умолчания ← администратор (для всех) ← пользователь.
      </Typography>
      <SettingsOverview />
    </div>
  );
}

export function SettingsPage() {
  return (
    <EditorThemeProvider>
      <Settings />
    </EditorThemeProvider>
  );
}
