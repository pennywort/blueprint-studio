import type { EditorIcon } from './editor-icons';
// Локальный набор иконок фреймворка (файл вне git, flamingo-icons на рабочей машине) —
// docs/local-overrides.md. Без файла алиас ведёт на заглушку без глифов.
import localResolver from '@local/framework-icons';

// Иконка фреймворка по имени из enum схемы (атрибут icon, shared/icon.schema.json,
// [owner 2026-10-20]): имя → компонент глифа или undefined, если глифа нет —
// тогда UI рисует монограмму (icon-stub.tsx, temporary-registry п. 8).
export type FrameworkIconResolver = (name: string) => EditorIcon | undefined;

export const resolveFrameworkIcon: FrameworkIconResolver = localResolver;
