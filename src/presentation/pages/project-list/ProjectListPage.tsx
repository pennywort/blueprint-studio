import { useCallback, useEffect, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { useNavigate } from 'react-router-dom';
import type { GraphSummary } from '@application/ports/graph-repository';
import { createEmptyServiceGraph, type ServiceGraph } from '@domain/model/service-graph';
import { toBlueprintId, type BlueprintId } from '@domain/model/ids';
import { useContainer } from '@presentation/app/App';
import { downloadTextFile, projectFileName } from '@presentation/features/projects/project-file';
import { EditorThemeProvider } from '@presentation/theme/editor-theme-provider';
import { HotkeysProvider, useHotkeysRoot } from '@presentation/features/hotkeys/hotkeys-provider';
import { useDismissLayer } from '@presentation/features/hotkeys/dismiss-layer';
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
  section: {
    marginTop: theme.spacing(4),
  },
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  card: {
    width: 260,
    borderRadius: theme.editor.shape.card,
    cursor: 'pointer',
    backgroundColor: theme.palette.background.paper,
  },
  cardActions: {
    display: 'flex',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  actionButton: {
    textTransform: 'none',
    minWidth: 0,
    padding: theme.spacing(0.25, 1),
  },
  hiddenInput: {
    display: 'none',
  },
}));

const formatSavedAt = (savedAt: string | null) =>
  savedAt ? `Сохранён ${new Date(savedAt).toLocaleString('ru-RU')}` : 'Сохранён';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Импорт файла, id которого уже есть в хранилище: заменить или взять копией.
type ImportConflict = { graph: ServiceGraph };

// Dev-разводящая (F1, решение владельца): боевой запуск будет по ссылке из
// другого приложения — этот экран нужен только для dev-режима. Список
// сохранённых карт, создание, удаление, импорт/экспорт файла проекта JSON
// [owner 2026-10-15] — чтобы фиксировать состояние карты для разбора багов.
function ProjectList() {
  const classes = useStyles();
  const navigate = useNavigate();
  const { graphRepository, graphFileCodec, idGenerator } = useContainer().cradle;
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [projects, setProjects] = useState<GraphSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<GraphSummary | null>(null);
  const [importConflict, setImportConflict] = useState<ImportConflict | null>(null);
  // Окна — слои стека Esc (dismiss-layer.ts); корень страницы — граница хоткеев.
  const hotkeysRoot = useHotkeysRoot();
  const createLayer = useDismissLayer(createOpen, () => setCreateOpen(false));
  const deleteLayer = useDismissLayer(pendingDelete !== null, () => setPendingDelete(null));
  const conflictLayer = useDismissLayer(importConflict !== null, () => setImportConflict(null));

  const refresh = useCallback(() => {
    graphRepository
      .list()
      .then(setProjects)
      .catch((reason: unknown) => setError(`Не удалось прочитать проекты: ${errorMessage(reason)}`));
  }, [graphRepository]);

  useEffect(refresh, [refresh]);

  const openProject = (id: BlueprintId) => navigate(`/editor?project=${encodeURIComponent(id)}`);

  const saveAndOpen = (graph: ServiceGraph) =>
    graphRepository
      .save(graph)
      .then(() => openProject(graph.id))
      .catch((reason: unknown) => setError(`Не удалось сохранить проект: ${errorMessage(reason)}`));

  const createProject = () => {
    const title = newTitle.trim() || 'Новый проект';
    setCreateOpen(false);
    setNewTitle('');
    void saveAndOpen(createEmptyServiceGraph(idGenerator.next(), title));
  };

  const confirmDelete = () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (target) {
      graphRepository
        .remove(target.id)
        .then(refresh)
        .catch((reason: unknown) => setError(`Не удалось удалить проект: ${errorMessage(reason)}`));
    }
  };

  const exportProject = (event: MouseEvent, id: BlueprintId) => {
    event.stopPropagation();
    graphRepository
      .load(id)
      .then((graph) => {
        if (graph) {
          downloadTextFile(projectFileName(graph.title), graphFileCodec.serialize(graph));
        }
      })
      .catch((reason: unknown) => setError(`Не удалось выгрузить проект: ${errorMessage(reason)}`));
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Сброс — повторный выбор того же файла снова вызовет onChange.
    event.target.value = '';
    if (!file) {
      return;
    }
    file
      .text()
      .then((text) => {
        const graph = graphFileCodec.parse(text);
        setError(null);
        if (projects?.some((project) => project.id === graph.id)) {
          setImportConflict({ graph });
        } else {
          void saveAndOpen(graph);
        }
      })
      .catch((reason: unknown) => setError(`Не удалось загрузить «${file.name}»: ${errorMessage(reason)}`));
  };

  const resolveConflict = (asCopy: boolean) => {
    const conflict = importConflict;
    setImportConflict(null);
    if (conflict) {
      void saveAndOpen(
        asCopy
          ? {
              ...conflict.graph,
              id: toBlueprintId(idGenerator.next()),
              title: `${conflict.graph.title} (копия)`,
            }
          : conflict.graph,
      );
    }
  };

  return (
    <div ref={hotkeysRoot} className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="h4">Проекты</Typography>
        <Button
          variant="contained"
          color="primary"
          disableElevation
          onClick={() => setCreateOpen(true)}
          data-testid="project-create"
        >
          Создать проект
        </Button>
        <Button variant="outlined" onClick={() => fileInputRef.current?.click()} data-testid="project-import">
          Загрузить из JSON
        </Button>
        <input
          ref={fileInputRef}
          className={classes.hiddenInput}
          type="file"
          accept=".json,application/json"
          onChange={importFile}
          data-testid="project-import-input"
        />
      </Box>
      {error ? (
        <Typography color="error" data-testid="project-error">
          {error}
        </Typography>
      ) : null}

      <Box className={classes.section}>
        <Typography variant="h6">Сохранённые</Typography>
        <Box className={classes.grid}>
          {projects?.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Пока пусто: создайте проект, загрузите JSON или сохраните встроенную карту в редакторе.
            </Typography>
          ) : null}
          {projects?.map((project) => (
            <Card
              key={project.id}
              className={classes.card}
              variant="outlined"
              data-testid="project-card-saved"
              onClick={() => openProject(project.id)}
            >
              <CardContent>
                <Typography variant="h6">{project.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatSavedAt(project.savedAt)}
                </Typography>
                <Box className={classes.cardActions}>
                  <Button
                    size="small"
                    className={classes.actionButton}
                    onClick={(event) => exportProject(event, project.id)}
                    data-testid="project-export"
                  >
                    Экспорт JSON
                  </Button>
                  <Button
                    size="small"
                    color="secondary"
                    className={classes.actionButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPendingDelete(project);
                    }}
                    data-testid="project-delete"
                  >
                    Удалить
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>

      <Box className={classes.section}>
        <Typography variant="h6">Встроенные</Typography>
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
        </Box>
      </Box>

      <Dialog {...createLayer} open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Новый проект</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Название"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                createProject();
              }
            }}
            inputProps={{ 'data-testid': 'project-create-title' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Отмена</Button>
          <Button color="primary" onClick={createProject} data-testid="project-create-confirm">
            Создать
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog {...deleteLayer} open={pendingDelete !== null} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Удалить проект?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            «{pendingDelete?.title}» будет удалён из браузера без возможности восстановления.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Отмена</Button>
          <Button color="secondary" onClick={confirmDelete} data-testid="project-delete-confirm">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog {...conflictLayer} open={importConflict !== null} onClose={() => setImportConflict(null)}>
        <DialogTitle>Проект уже есть</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Карта «{importConflict?.graph.title}» с тем же id уже сохранена. Заменить её содержимым файла или
            загрузить как копию?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportConflict(null)}>Отмена</Button>
          <Button onClick={() => resolveConflict(true)} data-testid="project-import-copy">
            Как копию
          </Button>
          <Button color="primary" onClick={() => resolveConflict(false)} data-testid="project-import-replace">
            Заменить
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export function ProjectListPage() {
  return (
    <EditorThemeProvider>
      {/* Хоткеи страницы: пока только Esc стека слоёв [owner 2026-10-30]. */}
      <HotkeysProvider>
        <ProjectList />
      </HotkeysProvider>
    </EditorThemeProvider>
  );
}
