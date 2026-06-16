export type ProcessInstanceTimelineEntryKind =
  | 'process_started'
  | 'process_completed'
  | 'process_canceled'
  | 'step_ready'
  | 'step_started'
  | 'step_completed'
  | 'step_canceled'
  | 'step_blocked'
  | 'step_skipped'
  | 'step_failed'
  | 'step_retry'
  | 'step_rollback'
  | 'step_action'
  | 'platform_event';

export interface ProcessInstanceTimelineBaseEntry {
  kind: ProcessInstanceTimelineEntryKind;
  occurredAt: string;
}

export interface ProcessLifecycleTimelineEntry
  extends ProcessInstanceTimelineBaseEntry {
  kind: 'process_started' | 'process_completed' | 'process_canceled';
  status: string;
}

export interface StepLifecycleTimelineEntry
  extends ProcessInstanceTimelineBaseEntry {
  kind:
    | 'step_ready'
    | 'step_started'
    | 'step_completed'
    | 'step_canceled'
    | 'step_blocked'
    | 'step_skipped'
    | 'step_failed'
    | 'step_retry'
    | 'step_rollback';
  stepInstanceId: number;
  stepOrder: number;
  stepName: string;
  status: string;
  actorTenantUserId?: number | null;
  cause?: string | null;
  logId?: number;
}

export interface StepActionTimelineEntry extends ProcessInstanceTimelineBaseEntry {
  kind: 'step_action';
  executionId: number;
  stepInstanceId: number;
  instanceStepActionId: number;
  runOn: string;
  actionType: string;
  status: string;
  result?: Record<string, unknown> | null;
  errorMessage?: string | null;
}

export interface ProcessPlatformEventTimelineEntry
  extends ProcessInstanceTimelineBaseEntry {
  kind: 'platform_event';
  recordId: number;
  eventName: string;
  correlationId?: string | null;
  causationId?: string | null;
  status: string;
}

export type ProcessInstanceTimelineEntry =
  | ProcessLifecycleTimelineEntry
  | StepLifecycleTimelineEntry
  | StepActionTimelineEntry
  | ProcessPlatformEventTimelineEntry;

export interface ProcessInstanceTimelineResult {
  processInstanceId: number;
  processTemplateId: number;
  tenantId: number;
  status: string;
  correlationId: string | null;
  entries: ProcessInstanceTimelineEntry[];
  summary: {
    processLifecycleCount: number;
    stepLifecycleCount: number;
    stepActionCount: number;
    platformEventCount: number;
  };
}
