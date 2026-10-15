import { Box, Card, CardContent, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import { useNavigate } from 'react-router-dom';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import type { EditorTheme } from '@presentation/theme/editor-theme';

const useStyles = makeStyles<EditorTheme>((theme) => ({
  root: {
    minHeight: '100vh',
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(4),
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginTop: theme.spacing(3),
  },
  card: {
    width: 240,
    borderRadius: 12,
    cursor: 'pointer',
    backgroundColor: theme.palette.background.paper,
  },
  // Заглушки будущих проектов: не кликабельны, визуально приглушены.
  stub: {
    width: 240,
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    opacity: 0.5,
    cursor: 'default',
  },
}));

// Карточки-заглушки: боевые проекты появятся с хранилищем карт, до тех пор
// разводящая показывает, как будет выглядеть сетка.
const STUB_TITLES = ['Проект-заглушка 1', 'Проект-заглушка 2', 'Проект-заглушка 3'];

// Dev-разводящая (F1, решение владельца): боевой запуск будет по ссылке из
// другого приложения, разводящая страница не планируется — этот экран нужен
// только для dev-режима. Минимальные карточки в стиле редактора; палитру
// будем менять отдельным агентом с доступом к файлам темы.
function ProjectList() {
  const classes = useStyles();
  const navigate = useNavigate();

  return (
    <Box className={classes.root}>
      <Typography variant="h4">Проекты</Typography>
      <Box className={classes.grid}>
        <Card
          className={classes.card}
          variant="outlined"
          data-testid="project-card-demo"
          onClick={() => navigate('/editor')}
        >
          <CardContent>
            <Typography variant="h6">Демо-карта</Typography>
            <Typography variant="body2" color="textSecondary">
              Открыть в редакторе
            </Typography>
          </CardContent>
        </Card>
        <Card
          className={classes.card}
          variant="outlined"
          data-testid="project-card-stress"
          onClick={() => navigate('/editor?project=stress')}
        >
          <CardContent>
            <Typography variant="h6">Стенд производительности</Typography>
            <Typography variant="body2" color="textSecondary">
              Большой нагрузочный граф
            </Typography>
          </CardContent>
        </Card>
        {STUB_TITLES.map((title) => (
          <Card className={classes.stub} variant="outlined" key={title} data-testid="project-card-stub">
            <CardContent>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2" color="textSecondary">
                Скоро
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export function ProjectListPage() {
  return (
    <EditorThemeProvider>
      <ProjectList />
    </EditorThemeProvider>
  );
}
