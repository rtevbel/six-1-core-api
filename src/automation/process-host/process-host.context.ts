import type { EntityManager } from 'typeorm';
import type { ProcessHostAdvanceOptions } from '../process-engine-state';

/**
 * Input to start a process for a typed job subject.
 */
export interface StartProcessParams {
  tenantId: number;
  createdBy: number;
  templateId: number;
  subjectType: string;
  subjectId: number;
  subjectMetadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  context?: Record<string, unknown> | null;
  /** When starting inside an existing transaction (e.g. project create). */
  entityManager?: EntityManager;
  /** Adapter-specific payload (e.g. project kanban status map). */
  hostData?: Record<string, unknown>;
  /** Child process linkage when spawned from call_process. */
  parentInstanceId?: number | null;
  parentStepId?: number | null;
  onChildFailure?: 'ignore' | 'pause_parent' | 'fail_parent';
  /** Skip host onProcessStarted (child processes must not re-seed project tasks). */
  skipHostOnStart?: boolean;
}

export interface ProcessHostContext {
  tenantId: number;
  createdBy: number;
  processInstanceId: number;
  templateId: number;
  subjectType: string;
  subjectId: number;
  subjectMetadata?: Record<string, unknown> | null;
  correlationId?: string | null;
  context?: Record<string, unknown> | null;
  entityManager: EntityManager;
  hostData?: Record<string, unknown>;
  /** Populated when invoked from the step orchestrator. */
  advance?: ProcessHostAdvanceOptions;
}

export interface StepStateChangedContext extends ProcessHostContext {
  stepInstanceId: number;
  engineState: string;
  stepOrder?: number;
  advance?: ProcessHostAdvanceOptions;
}

export interface StartProcessResult {
  processInstanceId: number;
  firstStepInstanceId: number | null;
  correlationId: string;
}
