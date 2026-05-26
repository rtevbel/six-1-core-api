/**
 * Process Runner RPC payload (v1) — see dynamic-process-generalization plan §5.2.
 */

export interface ProcessRunnerSubject {
  type: string;
  id: number;
  metadata?: Record<string, unknown> | null;
}

export interface ProcessRunnerChildSummary {
  processInstanceId: number;
  parentStepInstanceId: number;
  status: string;
  subjectType: string;
  subjectId: number;
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
  status: string;
  lastError: string | null;
  /** Gateway may call `v0.1_get_config_schema` with this object type. */
  schemaRef?: string;
}

export interface ProcessRunnerStep {
  stepInstanceId: number;
  stepOrder: number;
  name: string;
  stepType: string;
  status: string;
  isOptional: boolean;
  blockedReason: string | null;
  requirements: ProcessRunnerStepRequirement[];
  triggers: ProcessRunnerStepTrigger[];
  objectBindings: ProcessRunnerStepObjectBinding[];
  childProcessInstanceId?: number;
}

export interface ProcessRunnerPayload {
  processInstanceId: number;
  processTemplateId: number;
  tenantId: number;
  status: string;
  subject: ProcessRunnerSubject;
  context: Record<string, unknown> | null;
  correlationId: string | null;
  parentInstanceId: number | null;
  children: ProcessRunnerChildSummary[];
  steps: ProcessRunnerStep[];
  currentStepInstanceId: number | null;
}
