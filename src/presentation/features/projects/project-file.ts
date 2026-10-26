// Файл проекта в браузере [owner 2026-10-15]: скачивание JSON и чтение
// выбранного пользователем файла. Формат — за портом IGraphFileCodec.

// Имя файла из названия карты: без символов, запрещённых в именах файлов.
export function projectFileName(title: string): string {
  const base = title.trim().replace(/[\\/:*?"<>|]+/g, '_') || 'проект';
  return `${base}.blueprint.json`;
}

export function downloadTextFile(fileName: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  // Отзыв после клика: браузер уже начал скачивание.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
