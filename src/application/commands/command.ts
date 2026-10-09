import type { ServiceGraph } from '@domain/model/service-graph';

// Конституция, железное правило 1: любое действие пользователя — команда
// application-слоя. Команда — чистая функция-мутация над черновиком Immer;
// патчи do/undo производит CommandBus, а не сама команда.
export interface Command {
  readonly name: string;
  apply(draft: ServiceGraph): void;
}
