import { Typography } from '@sber-friend/flamingo-core';
import { Link } from 'react-router-dom';

// Страница-заглушка списка проектов (эпик 001): smoke test Flamingo-темы.
export function ProjectListPage() {
  return (
    <main>
      <Typography variant="h1">blueprint-studio</Typography>
      <Typography variant="body1">Список архитектурных карт появится здесь.</Typography>
      <nav>
        <Link to="/editor">Редактор</Link> · <Link to="/preview">Предпросмотр</Link>
      </nav>
    </main>
  );
}
