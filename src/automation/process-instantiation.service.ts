import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ProcessInstantiationService {
  constructor(private readonly ds: DataSource) {}

  async instantiateProcess(templateId: number, tenantId: number, createdBy: number): Promise<number> {
    return await this.ds.transaction(async (em) => {
      const res = await em.query(
        `INSERT INTO process_instances (process_template_id, tenant_id, status, created_by, started_at)
         VALUES (?, ?, 'active', ?, NOW())`,
        [templateId, tenantId, createdBy],
      );
      const processInstanceId = res.insertId ?? res[0]?.insertId;

      const steps = await em.query(
        `SELECT * FROM process_template_steps WHERE process_template_id = ? ORDER BY step_order ASC`,
        [templateId],
      );

      let firstStepId: number | null = null;

      for (const s of steps) {
        const [nameRow] = await em.query(
          `SELECT name FROM process_template_step_descriptions
            WHERE process_template_step_id = ? ORDER BY process_template_step_description_id LIMIT 1`,
          [s.process_template_step_id],
        );

        const stepInsert = await em.query(
          `INSERT INTO process_instance_steps
            (process_instance_id, process_template_step_id, name, task_type, step_order, is_optional, status , blocked_reason , ready_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            processInstanceId,
            s.process_template_step_id,
            nameRow?.name ?? null,
            s.task_type,
            s.step_order,
            s.is_optional,
            s.step_order === 1 ? 'ready' : 'pending',
            '',
            s.step_order === 1 ? new Date() : null,
          ],
        );
        const stepInstanceId = stepInsert.insertId ?? stepInsert[0]?.insertId;
        if (s.step_order === 1) firstStepId = stepInstanceId;
        
        // Copy requirements
        const reqs = await em.query(
          `SELECT * FROM process_template_step_requirements WHERE process_template_step_id = ?`,
          [s.process_template_step_id],
        );
        for (const r of reqs) {
            const jsonSchemaStr = JSON.stringify(r.json_schema ?? {}); // ensure it's a string  
          await em.query(
            `INSERT INTO process_instance_step_requirements
              (step_instance_id, process_template_step_requirement_id, requirement_type, requirement_key, json_schema, is_mandatory, status)
             VALUES (?, ?, ?, ?,?, 1, 'none')`,
            [stepInstanceId, r.process_template_step_requirement_id, r.requirement_type, r.requirement_key, jsonSchemaStr],
          );
        }

        // Copy triggers
        const trigs = await em.query(
          `SELECT * FROM process_template_step_trigger_conditions WHERE process_template_step_id = ?`,
          [s.process_template_step_id],
        );
        for (const t of trigs) {
            const jsonSchemaStr = JSON.stringify(t.json_schema ?? {}); // ensure it's a string  
          await em.query(
            `INSERT INTO process_instance_step_triggers
              (step_instance_id, process_template_step_trigger_condition_id, condition_type, condition_key, json_schema, status)
             VALUES (?, ?, ?, ?, ? , 'unmet')`,
            [stepInstanceId, t.step_trigger_condition_id, t.condition_type, t.condition_key, jsonSchemaStr,'unmet'],
          );
        }
      }
      return processInstanceId;
    });
  }
}
