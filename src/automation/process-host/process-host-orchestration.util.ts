import type { EntityManager, QueryRunner } from 'typeorm';
import type { ProcessHostAdvanceOptions } from '../process-engine-state';
import type {
  ProcessHostContext,
  StepStateChangedContext,
} from './process-host.context';

type ProcessInstanceRow = {
  tenant_id: number;
  created_by: number;
  process_instance_id: number;
  process_template_id: number;
  subject_type: string;
  subject_id: number;
  subject_metadata: Record<string, unknown> | null;
  correlation_id: string | null;
  context: Record<string, unknown> | null;
};

/**
 * Loads process_instances row for host dispatch inside orchestrator transactions.
 */
export async function loadProcessInstanceRow(
  em: EntityManager,
  processInstanceId: number,
): Promise<ProcessInstanceRow | null> {
  const rows: ProcessInstanceRow[] = await em.query(
    `SELECT tenant_id,
            created_by,
            process_instance_id,
            process_template_id,
            subject_type,
            subject_id,
            subject_metadata,
            correlation_id,
            context
       FROM process_instances
      WHERE process_instance_id = ?
      LIMIT 1`,
    [processInstanceId],
  );
  return rows[0] ?? null;
}

export function buildProcessHostContext(
  em: EntityManager,
  proc: ProcessInstanceRow,
  advance?: ProcessHostAdvanceOptions,
): ProcessHostContext {
  return {
    tenantId: Number(proc.tenant_id),
    createdBy: Number(proc.created_by),
    processInstanceId: Number(proc.process_instance_id),
    templateId: Number(proc.process_template_id),
    subjectType: proc.subject_type,
    subjectId: Number(proc.subject_id),
    subjectMetadata: proc.subject_metadata,
    correlationId: advance?.correlationId ?? proc.correlation_id,
    context: proc.context,
    entityManager: em,
    advance,
  };
}

export function buildStepStateChangedContext(
  em: EntityManager,
  proc: ProcessInstanceRow,
  params: {
    stepInstanceId: number;
    engineState: string;
    stepOrder?: number;
    advance?: ProcessHostAdvanceOptions;
  },
): StepStateChangedContext {
  return {
    ...buildProcessHostContext(em, proc, params.advance),
    stepInstanceId: params.stepInstanceId,
    engineState: params.engineState,
    stepOrder: params.stepOrder,
    advance: params.advance,
  };
}

export function entityManagerFromQueryRunner(qr: QueryRunner): EntityManager {
  return qr.manager;
}
