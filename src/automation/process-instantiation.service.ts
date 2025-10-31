// ──────────────────────────────────────────────────────────────────────────────
// Independent class: ProcessInstantiationService (safer TX + clean copies)
// ──────────────────────────────────────────────────────────────────────────────
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class ProcessInstantiationService {
  constructor(private readonly ds: DataSource) {}

  // Retry wrapper for transient InnoDB issues (deadlocks/lock waits)
  private async withTxRetry<T>(
    fn: (em: EntityManager) => Promise<T>,
    attempts = 4,
  ): Promise<T> {
    let lastErr: any;
    for (let i = 1; i <= attempts; i++) {
      try {
        return await this.ds.transaction('READ COMMITTED', fn);
      } catch (err: any) {
        const code = err?.code || err?.errno;
        if ((code === 1205 || code === 1213) && i < attempts) {
          // lock wait timeout / deadlock
          await new Promise((r) => setTimeout(r, 50 * i)); // small backoff
          lastErr = err;
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  /**
   * Standalone entry — runs in its own READ COMMITTED transaction with retry/backoff.
   * If you need to compose with a caller's transaction, use `instantiateProcessIn`.
   */
  async instantiateProcess(
    templateId: number,
    tenantId: number,
    createdBy: number,
  ): Promise<number> {
    return await this.withTxRetry(async (em) =>
      this.instantiateProcessIn(em, templateId, tenantId, createdBy),
    );
  }

  /**
   * Composable variant that uses the provided EntityManager (no new transaction).
   * Optimized to reduce lock contention: fewer round-trips, deterministic order, bulk inserts.
   */
  async instantiateProcessIn(
    em: EntityManager,
    templateId: number,
    tenantId: number,
    createdBy: number,
  ): Promise<number> {
    // 1) Create process instance
    const res: any = await em.query(
      `INSERT INTO process_instances (process_template_id, tenant_id, status, created_by, started_at)
       VALUES (?, ?, 'active', ?, NOW())`,
      [templateId, tenantId, createdBy],
    );
    const processInstanceId: number = Number(
      res?.insertId ?? res?.[0]?.insertId,
    );

    // 2) Fetch template steps + name via correlated subquery (ordered for consistent lock order)
    const steps: Array<{
      process_template_step_id: number;
      step_order: number;
      task_type: string | null;
      is_optional: 0 | 1 | null;
      name: string | null;
    }> = await em.query(
      `SELECT pts.process_template_step_id,
              pts.step_order,
              pts.task_type,
              pts.is_optional,
              (SELECT d.name
                 FROM process_template_step_descriptions d
                WHERE d.process_template_step_id = pts.process_template_step_id
                ORDER BY d.process_template_step_description_id ASC
                LIMIT 1) AS name
         FROM process_template_steps pts
        WHERE pts.process_template_id = ?
        ORDER BY pts.step_order ASC`,
      [templateId],
    );

    // 3) Insert instance steps (one by one to obtain ids, still O(n) but minimal work per row)
    const stepInstanceIds: number[] = [];
    for (const s of steps) {
      const isFirst = s.step_order === 1;
      const status = isFirst ? 'ready' : 'pending';
      const insert: any = await em.query(
        `INSERT INTO process_instance_steps
           (process_instance_id, process_template_step_id, name, task_type, step_order, is_optional, status, blocked_reason, ready_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, '', ${isFirst ? 'NOW()' : 'NULL'}, NOW(), NOW())`,
        [
          processInstanceId,
          s.process_template_step_id,
          s.name ?? `Step ${s.step_order}`,
          s.task_type ?? null,
          s.step_order,
          s.is_optional ?? 0,
          status,
        ],
      );
      stepInstanceIds.push(Number(insert?.insertId ?? insert?.[0]?.insertId));
    }

    // Map: template step id -> instance step id
    const tplToInst = new Map<number, number>();
    steps.forEach((s, i) =>
      tplToInst.set(s.process_template_step_id, stepInstanceIds[i]),
    );

    // 4) Bulk copy requirements (single INSERT ... VALUES (...),(...))
    if (steps.length) {
      const tplIds = steps.map((s) => s.process_template_step_id);
      const reqs: Array<any> = await em.query(
        `SELECT process_template_step_requirement_id,
                process_template_step_id,
                requirement_type,
                requirement_key,
                json_schema
           FROM process_template_step_requirements
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})`,
        tplIds,
      );

      if (reqs.length) {
        const placeholders: string[] = [];
        const values: any[] = [];
        for (const r of reqs) {
          const stepInstanceId = tplToInst.get(r.process_template_step_id);
          if (!stepInstanceId) continue;
          placeholders.push('(?, ?, ?, ?, ?, ?, "none")');
          values.push(
            stepInstanceId,
            r.process_template_step_requirement_id,
            r.requirement_type,
            r.requirement_key,
            JSON.stringify(r.json_schema ?? {}),
            1,
          );
        }
        if (placeholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_requirements
               (step_instance_id, process_template_step_requirement_id, requirement_type, requirement_key, json_schema, is_mandatory, status)
             VALUES ${placeholders.join(',')}`,
            values,
          );
        }
      }

      // 5) Bulk copy triggers
      const trigs: Array<any> = await em.query(
        `SELECT step_trigger_condition_id,
                process_template_step_id,
                condition_type,
                condition_key,
                json_schema
           FROM process_template_step_trigger_conditions
          WHERE process_template_step_id IN (${tplIds.map(() => '?').join(',')})`,
        tplIds,
      );

      if (trigs.length) {
        const placeholders: string[] = [];
        const values: any[] = [];
        for (const t of trigs) {
          const stepInstanceId = tplToInst.get(t.process_template_step_id);
          if (!stepInstanceId) continue;
          placeholders.push('(?, ?, ?, ?, ?, "unmet")');
          values.push(
            stepInstanceId,
            t.step_trigger_condition_id,
            t.condition_type,
            t.condition_key,
            JSON.stringify(t.json_schema ?? {}),
          );
        }
        if (placeholders.length) {
          await em.query(
            `INSERT INTO process_instance_step_triggers
               (step_instance_id, process_template_step_trigger_condition_id, condition_type, condition_key, json_schema, status)
             VALUES ${placeholders.join(',')}`,
            values,
          );
        }
      }
    }

    return processInstanceId;
  }
}
