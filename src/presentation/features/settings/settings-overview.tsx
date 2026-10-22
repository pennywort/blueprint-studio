import { useState } from 'react';
import { Button, Chip, Paper, Typography, makeStyles } from '@blueprint-vendor/flamingo-core';
import type { AnySettingsSection } from '@application/settings/settings-section';
import type { SettingsSnapshot } from '@application/settings/editor-settings';
import type { SettingsIssue } from '@application/settings/resolve-settings';
import type { EditorTheme } from '@presentation/theme/editor-theme';
import { useContainer } from '@presentation/app/App';
import { useSettingsSnapshot } from './use-settings';

// Панель настроек, режим просмотра (R-ADM-4, [owner 2026-10-22]): разделы —
// секции реестра в порядке регистрации; по каждой — кто может менять (scope),
// какие слои её переопределяют, ошибки слоёв и JSON действующего значения и
// переопределений. Запись (вкладка «Мои», админ) — следующие шаги R-ADM-3/4.

const useStyles = makeStyles<EditorTheme>((theme) => ({
  section: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.editor.shape.card,
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  key: {
    fontFamily: 'monospace',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  actionButton: {
    textTransform: 'none',
  },
  json: {
    margin: theme.spacing(1, 0, 0),
    padding: theme.spacing(1),
    maxHeight: 400,
    overflow: 'auto',
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.editor.shape.card,
  },
}));

const SCOPE_LABEL: Record<AnySettingsSection['scope'], string> = {
  admin: 'меняет администратор',
  user: 'меняет пользователь',
};

const LAYER_LABEL: Record<SettingsIssue['layer'], string> = {
  admin: 'администратор',
  user: 'пользователь',
};

// Что можно раскрыть по секции: значение после всех слоёв и сырые переопределения.
type View = 'value' | 'admin' | 'user' | 'defaults';

const VIEW_LABEL: Record<View, string> = {
  value: 'Действующее значение',
  admin: 'Переопределение администратора',
  user: 'Переопределение пользователя',
  defaults: 'Умолчания',
};

function viewContent(view: View, section: AnySettingsSection, snapshot: SettingsSnapshot): unknown {
  switch (view) {
    case 'value':
      return snapshot.values.get(section.key);
    case 'admin':
      return snapshot.admin[section.key];
    case 'user':
      return snapshot.user[section.key];
    case 'defaults':
      return section.defaults;
  }
}

function IssueList({ issues }: { issues: readonly SettingsIssue[] }) {
  return (
    <>
      {issues.map((issue, index) => (
        <Typography key={index} variant="body2" color="error" data-testid="settings-issue">
          {LAYER_LABEL[issue.layer]}
          {issue.section ? ` · ${issue.section}` : ''}: {issue.message}
        </Typography>
      ))}
    </>
  );
}

function SectionCard({ section, snapshot }: { section: AnySettingsSection; snapshot: SettingsSnapshot }) {
  const classes = useStyles();
  const [open, setOpen] = useState<View | null>(null);
  const issues = snapshot.issues.filter((issue) => issue.section === section.key);
  const views: View[] = [
    'value',
    ...(section.key in snapshot.admin ? (['admin'] as const) : []),
    ...(section.key in snapshot.user ? (['user'] as const) : []),
    'defaults',
  ];

  return (
    <Paper
      variant="outlined"
      className={classes.section}
      data-testid="settings-section"
      data-key={section.key}
    >
      <div className={classes.head}>
        <Typography variant="h6">{section.title}</Typography>
        <Typography variant="body2" color="textSecondary" className={classes.key}>
          {section.key}
        </Typography>
        <Chip size="small" label={SCOPE_LABEL[section.scope]} />
        {section.key in snapshot.admin ? (
          <Chip
            size="small"
            color="primary"
            label="изменено администратором"
            data-testid="settings-admin-override"
          />
        ) : null}
        {section.key in snapshot.user ? (
          <Chip
            size="small"
            color="primary"
            label="изменено пользователем"
            data-testid="settings-user-override"
          />
        ) : null}
      </div>
      <IssueList issues={issues} />
      <div className={classes.actions}>
        {views.map((view) => (
          <Button
            key={view}
            size="small"
            variant={open === view ? 'contained' : 'outlined'}
            disableElevation
            className={classes.actionButton}
            onClick={() => setOpen(open === view ? null : view)}
            data-testid={`settings-view-${view}`}
          >
            {VIEW_LABEL[view]}
          </Button>
        ))}
      </div>
      {open ? (
        <pre className={classes.json} data-testid="settings-json">
          {JSON.stringify(viewContent(open, section, snapshot), null, 2)}
        </pre>
      ) : null}
    </Paper>
  );
}

export function SettingsOverview() {
  const sections = useContainer().cradle.editorSettings.listSections();
  const snapshot = useSettingsSnapshot();
  const known = new Set(sections.map((section) => section.key));
  // Ошибки документа целиком и неизвестные секции — не относятся ни к одной карточке.
  const generalIssues = snapshot.issues.filter((issue) => !known.has(issue.section));

  return (
    <div data-testid="settings-overview">
      <IssueList issues={generalIssues} />
      {sections.map((section) => (
        <SectionCard key={section.key} section={section} snapshot={snapshot} />
      ))}
    </div>
  );
}
