import type { NodeTypes } from '@xyflow/react';
import { ScenarioNode } from './scenario-node';
import { FormNode } from './form-node';

// Реестр кастомных узлов канваса (T-031): ключи — CanvasNodeType из
// graph-flow-adapter. Главная и Подсценарий рендерятся одним компонентом,
// различаются данными.
export const canvasNodeTypes: NodeTypes = {
  home: ScenarioNode,
  subScenario: ScenarioNode,
  form: FormNode,
};
