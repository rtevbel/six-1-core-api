/**
 * Evaluation context for step extension json-logic rules (F0.3 / F1).
 */

export interface ProcessStepExtensionBindingSummary {
  objectType: string;
  status: string;
  coreId?: number;
  instanceId?: number;
  resolutionMode?: string;
}

export interface ProcessStepExtensionSubjectContext {
  type: string;
  id: number;
  metadata?: Record<string, unknown> | null;
}

export interface ProcessStepExtensionStepContext {
  stepInstanceId: number;
  stepOrder: number;
  status: string;
  taskType: string;
  isOptional: boolean;
}

/** Payload passed to `jsonLogic.apply` for `visibleWhen` / `autoAdvanceWhen`. */
export interface ProcessStepExtensionEvaluationData {
  context: Record<string, unknown>;
  subject: ProcessStepExtensionSubjectContext;
  step: ProcessStepExtensionStepContext;
  bindings: ProcessStepExtensionBindingSummary[];
}

export interface ProcessStepExtensionEvaluationInput {
  processContext?: Record<string, unknown> | null;
  subject: ProcessStepExtensionSubjectContext;
  step: ProcessStepExtensionStepContext;
  bindings?: ProcessStepExtensionBindingSummary[];
  /** Instance or template `step_extensions_json` snapshot. */
  extensions?: Record<string, unknown> | null;
}

export interface ProcessStepExtensionEvaluationResult {
  /** Runner / orchestrator: show and activate step. */
  isVisible: boolean;
  /** Engine may auto-complete when other gates pass (F5). */
  autoAdvanceEligible: boolean;
  /** Raw rule outcome; `null` when flag off or rule absent. */
  visibleWhenResult: boolean | null;
  autoAdvanceWhenResult: boolean | null;
}
