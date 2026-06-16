import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';

export type ProcessCompletionCheck = {
  canComplete: boolean;
  reasons: string[];
};

/**
 * Central job-completion rules for dynamic processes (plan §7).
 */
@Injectable()
export class ProcessCompletionService {
  constructor(
    private readonly ds: DataSource,
    private readonly configObjectExecutor: ConfigObjectStepExecutor,
  ) {}

  async canCompleteProcess(
    processInstanceId: number,
    entityManager?: EntityManager,
  ): Promise<boolean> {
    const result = await this.evaluate(processInstanceId, entityManager);
    return result.canComplete;
  }

  async evaluate(
    processInstanceId: number,
    entityManager?: EntityManager,
  ): Promise<ProcessCompletionCheck> {
    const run = (em: EntityManager) =>
      this.evaluateInTransaction(em, processInstanceId);

    if (entityManager) {
      return run(entityManager);
    }

    return this.ds.transaction('READ COMMITTED', run);
  }

  private async evaluateInTransaction(
    em: EntityManager,
    processInstanceId: number,
  ): Promise<ProcessCompletionCheck> {
    const reasons: string[] = [];

    const [stepAgg] = await em.query(
      `SELECT COUNT(*) AS total,
              SUM(status IN ('completed', 'canceled', 'skipped')) AS terminal
         FROM process_instance_steps
        WHERE process_instance_id = ?`,
      [processInstanceId],
    );

    const total = Number(stepAgg?.total ?? 0);
    const terminal = Number(stepAgg?.terminal ?? 0);

    if (total === 0) {
      reasons.push('no_steps');
    } else if (terminal !== total) {
      reasons.push('mandatory_steps_not_terminal');
    }

    const [activeChildren] = await em.query(
      `SELECT COUNT(*) AS cnt
         FROM process_instances
        WHERE parent_instance_id = ?
          AND status NOT IN ('completed', 'canceled')`,
      [processInstanceId],
    );

    if (Number(activeChildren?.cnt ?? 0) > 0) {
      reasons.push('active_child_process');
    }

    const stepRows: Array<{ step_instance_id: number }> = await em.query(
      `SELECT step_instance_id
         FROM process_instance_steps
        WHERE process_instance_id = ?`,
      [processInstanceId],
    );

    for (const step of stepRows) {
      const bindingsOk =
        await this.configObjectExecutor.areMandatoryBindingsValid(
          em,
          Number(step.step_instance_id),
        );
      if (!bindingsOk) {
        reasons.push(`object_bindings_invalid:step=${step.step_instance_id}`);
        break;
      }
    }

    return {
      canComplete: reasons.length === 0,
      reasons,
    };
  }
}
