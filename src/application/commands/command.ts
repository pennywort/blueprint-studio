import type { ServiceGraph } from '@domain/model/service-graph';
import type { EditorRules } from '@domain/editor-rules';

// Конституция, железное правило 1: любое действие пользователя — команда
// application-слоя. Команда — чистая функция-мутация над черновиком Immer;
// патчи do/undo производит CommandBus, а не сама команда.

// Контекст выполнения (R-CFG-9, R-ADM): действующие правила редактора из
// настроек. Команда читает их отсюда, а не из модульных таблиц — смена
// настроек на лету сразу действует на каскады и проверки команд.
export type CommandContext = {
  readonly rules: EditorRules;
};

export interface Command {
  readonly name: string;
  apply(draft: ServiceGraph, context: CommandContext): void;
}
