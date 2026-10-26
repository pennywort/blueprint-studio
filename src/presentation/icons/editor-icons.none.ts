import type { EditorIconOverrides } from './editor-icons';

// Заглушка для алиаса @local/editor-icons, когда локального editor-icons.local.tsx
// нет (облако, CI): переопределений нет, работают иконки MUI. docs/local-overrides.md.
const noOverrides: EditorIconOverrides = {};

export default noOverrides;
