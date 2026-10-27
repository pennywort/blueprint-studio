import type { FrameworkIconResolver } from './framework-icons';

// Заглушка для алиаса @local/framework-icons, когда локального framework-icons.local.tsx
// нет (облако, CI): глифов нет, редактор рисует монограммы. docs/local-overrides.md.
const noGlyphs: FrameworkIconResolver = () => undefined;

export default noGlyphs;
