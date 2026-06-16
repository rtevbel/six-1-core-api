/**
 * Process Runner RPC payload — v1 base + v2 step extension fields (F2).
 * See dynamic-process-generalization plan §5.2 and `docs/runner-step-extension-json-logic.md`.
 */

export interface ProcessRunnerStepUiExtension {
  icon?: string;
  color?: string;
  helpText?: string;
  groupName?: string;
}

/** Instance snapshot of template `step_extensions_json` (rules + UI hints). */
export interface ProcessRunnerStepExtensions {
  visibleWhen?: Record<string, unknown> | null;
  allowSkip?: boolean;
  autoAdvanceWhen?: Record<string, unknown> | null;
  parallelGroupId?: string | null;
  ui?: ProcessRunnerStepUiExtension | null;
}

export interface ProcessRunnerSubject {
  type: string;
  id: number;
  metadata?: Record<string, unknown> | null;
}

export interface ProcessRunnerChildProgress {
  totalSteps: number;
  completedSteps: number;
  canceledSteps: number;
  currentStepInstanceId: number | null;
  currentStepName: string | null;
}

export interface ProcessRunnerChildSummary {
  processInstanceId: number;
  processTemplateId: number;
  parentStepInstanceId: number;
  parentStepOrder: number;
  parentStepName: string;
  status: string;
  /** @deprecated Prefer `subject` — retained for gateway backward compatibility */
  subjectType: string;
  /** @deprecated Prefer `subject` — retained for gateway backward compatibility */
  subjectId: number;
  subject: ProcessRunnerSubject;
  correlationId: string | null;
  startedAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  progress: ProcessRunnerChildProgress;
  /** Present when the request `childDepth` includes this child (E5). */
  runner?: ProcessRunnerPayload;
}

export interface ProcessRunnerStepAssignee {
  tenantUserId: number;
  assignmentOrder: number;
  isPrimary: boolean;
}

export interface ProcessRunnerStepRequirement {
  requirementInstanceId: number;
  processTemplateStepRequirementId: number;
  requirementType: string;
  requirementKey: string;
  jsonSchema: Record<string, unknown>;
  isMandatory: boolean;
  status: string;
  lastSubmissionId: number | null;
  approvedAt: string | null;
}

export interface ProcessRunnerStepTrigger {
  triggerInstanceId: number;
  processTemplateStepTriggerConditionId: number;
  conditionType: string;
  conditionKey: string;
  jsonSchema: Record<string, unknown>;
  status: string;
  metAt: string | null;
}

export interface ProcessRunnerStepObjectBinding {
  stepObjectInstanceId: number;
  bindingId: number | null;
  configObjectId: number;
  objectType: string;
  instanceId?: number;
  coreId?: number;
  resolutionMode?: 'standalone' | 'sor_bound' | 'system_table';
  status: string;
  lastError: string | null;
  /** Gateway may call `v0.1_get_config_schema` with this object type. */
  schemaRef?: string;
}

export interface ProcessRunnerStep {
  stepInstanceId: number;
  processTemplateStepId: number;
  stepOrder: number;
  name: string;
  stepType: string;
  status: string;
  isOptional: boolean;
  blockedReason: string | null;
  readyAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  canceledAt: string | null;
  /** Permission keys required to complete this step (empty = no extra gate). */
  requiredPermissions: string[];
  /** Whether the requesting caller satisfies {@link requiredPermissions}. */
  callerCanComplete: boolean;
  /** Whether the UI may offer complete for this step (state + permissions). */
  canComplete: boolean;
  /** Copied from template at instantiation (E6). */
  assignees: ProcessRunnerStepAssignee[];
  /** Primary assignee (`assignment_order` lowest); mirrors `data.assigneeId` on `process_step_ready`. */
  primaryAssigneeId: number | null;
  requirements: ProcessRunnerStepRequirement[];
  triggers: ProcessRunnerStepTrigger[];
  objectBindings: ProcessRunnerStepObjectBinding[];
  childProcessInstanceId?: number;
  /** When {@link childProcessInstanceId} is set, true while the child is non-terminal. */
  childProcessActive?: boolean;
  /** Copied from instance `step_extensions_json`; omitted when empty. */
  extensions?: ProcessRunnerStepExtensions | null;
  /** Runner v2: `visibleWhen` outcome when `PROCESS_RUNNER_V2_ENABLED`; otherwise `true`. */
  isVisible: boolean;
  /** Runner v2: caller may skip (`allowSkip` or `isOptional` + permissions); skip RPC in F4. */
  canSkip: boolean;
  /** Runner v2: `autoAdvanceWhen` satisfied when flag enabled; otherwise `false`. */
  autoAdvanceEligible: boolean;
  /** Runner v2+: last recorded failure details (F6). */
  lastFailure?: {
    occurredAt: string;
    errorCode?: string;
    errorDetail?: string;
  } | null;

  /** Runner v3: collaboration lock holder (tenantUserId) when present and not expired. */
  lockHolder?: number | null;
  /** Runner v3: lock expiry (ISO) when {@link lockHolder} present. */
  lockExpiresAt?: string | null;
}

export interface ProcessRunnerPayload {
  processInstanceId: number;
  processTemplateId: number;
  tenantId: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  subject: ProcessRunnerSubject;
  context: Record<string, unknown> | null;
  correlationId: string | null;
  parentInstanceId: number | null;
  children: ProcessRunnerChildSummary[];
  steps: ProcessRunnerStep[];
  currentStepInstanceId: number | null;
}
