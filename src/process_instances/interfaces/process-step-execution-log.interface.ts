import type {
  ProcessStepExecutionCause,
  ProcessStepExecutionEvent,
} from '../process-step-execution-log.constants';

export interface ProcessStepExecutionLogEntry {
  logId: number;
  processInstanceId: number;
  stepInstanceId: number;
  tenantId: number;
  stepOrder: number;
  stepName: string | null;
  event: ProcessStepExecutionEvent;
  previousStatus: string | null;
  newStatus: string;
  cause: ProcessStepExecutionCause | null;
  actorTenantUserId: number | null;
  correlationId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
}

export interface ProcessStepExecutionLogResult {
  processInstanceId: number;
  tenantId: number;
  entries: ProcessStepExecutionLogEntry[];
  total: number;
}
