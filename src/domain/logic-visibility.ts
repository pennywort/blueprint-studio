import type { LogicRule } from './model/logic-rule';
import type { ElementId } from './model/ids';

// Оценка условной видимости «Сложной логики» (T-037/T-062, §7 дизайн-дока).
//
// Семантика:
// 1. Элемент-цель с правилами скрыт по умолчанию; показывается, когда
//    выполнено хотя бы одно правило (неявное ИЛИ, L3).
// 2. Каскад (§7.4): если видимость B зависит от A, а C — от B, то при
//    скрытом A скрыт и C — правило срабатывает, только когда его источник
//    виден (сам не скрыт другими правилами).
// 3. optionSelected = «option входит в текущее значение» — множественный
//    выбор поддержан тем же условием (L-Q2).
//
// Скрытый required-элемент не валидируется и не блокирует отправку, его
// значение сохраняется (§7.2) — это правило рантайма предпросмотра, здесь
// оно не нужно.
//
// Чистая функция доменного слоя: используется предпросмотром (T-068),
// инспектором и будущим генератором MicroAppDescriptor (Epic 005).

// Состояние формы: элемент-источник → выбранные значения (value option'ов).
export type FormState = ReadonlyMap<string, readonly string[]>;

// Множество ВИДИМЫХ элементов из числа имеющих правила. Элементы без правил
// видимы всегда и в результат не входят — проверка «скрыт ли элемент»:
// есть правила на элемент && !visible.has(element.id).
export function evaluateVisibility(
  rules: readonly LogicRule[],
  formState: FormState,
): ReadonlySet<ElementId> {
  // Элементы, являющиеся целями хотя бы одного правила: только они могут
  // быть скрыты; источник, не являющийся целью, виден всегда.
  const targetsWithRules = new Set<string>(rules.map((rule) => rule.targetElementId));
  const visible = new Set<ElementId>();

  // Итерации до неподвижной точки: каждый проход может открыть цели, чьи
  // источники стали видимы на предыдущем проходе (каскад). Циклы видимости
  // запрещены инвариантом L-I6, поэтому сходимость гарантирована;
  // ограничение проходов — защита от битых данных.
  for (let pass = 0; pass <= rules.length; pass += 1) {
    let changed = false;
    for (const rule of rules) {
      if (visible.has(rule.targetElementId)) {
        continue;
      }
      // Источник, сам являющийся целью правил, участвует только когда
      // виден (каскад, §7.4).
      if (targetsWithRules.has(rule.sourceElementId) && !visible.has(rule.sourceElementId)) {
        continue;
      }
      if (rule.condition.kind === 'optionSelected') {
        const values = formState.get(rule.sourceElementId) ?? [];
        if (!values.includes(rule.condition.optionId)) {
          continue;
        }
      }
      visible.add(rule.targetElementId);
      changed = true;
    }
    if (!changed) {
      break;
    }
  }

  return visible;
}
