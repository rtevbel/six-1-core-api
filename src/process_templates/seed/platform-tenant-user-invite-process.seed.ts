import { QueryRunner } from 'typeorm';
import { DEFAULT_COMPLETION_RULE } from '../../automation/process-step-object-binding.constants';

const TEMPLATE_SET_KEY = 'platform_tenant_users';
const LANGUAGE_ID = 1;
export const INVITE_TENANT_USER_PROCESS_NAME = 'Invite tenant user';

const ADMIN_SPEC = {
  type: 'tenant_role',
  roleName: 'Admin',
};

interface SeededIds {
  creatorTenantUserId: number;
  invitationConfigObjectId: number;
}

/**
 * Idempotent platform journey: await acceptance after an invitation is sent from Object Runner.
 */
export async function seedPlatformTenantUserInviteProcess(
  queryRunner: QueryRunner,
): Promise<void> {
  const ids = await resolveIds(queryRunner);
  const templateId = await insertTemplate(
    queryRunner,
    ids,
    INVITE_TENANT_USER_PROCESS_NAME,
    'Track invitation acceptance after sending from User invitations. Resend from the invitations list.',
  );

  const sent = await insertStep(queryRunner, ids, templateId, {
    order: 1,
    name: 'Invitation sent',
    description:
      'The invite email was sent. Confirm the invitation record, then wait for the invitee.',
    assigneeSpec: ADMIN_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    sent,
    ids.invitationConfigObjectId,
    'use_existing',
  );

  const awaitAccept = await insertStep(queryRunner, ids, templateId, {
    order: 2,
    name: 'Await acceptance',
    description:
      'Wait until the invitee opens the accept-invitation link. Resend from the User invitations list if needed.',
    assigneeSpec: ADMIN_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    awaitAccept,
    ids.invitationConfigObjectId,
    'use_existing',
  );

  await insertStep(queryRunner, ids, templateId, {
    order: 3,
    name: 'Complete',
    description: 'The invitation was accepted.',
    assigneeSpec: ADMIN_SPEC,
  });
}

async function resolveIds(queryRunner: QueryRunner): Promise<SeededIds> {
  const tuRows: Array<{ tenant_user_id: number }> = await queryRunner.query(`
    SELECT tenant_user_id FROM tenant_users ORDER BY tenant_user_id ASC LIMIT 1
  `);
  if (!tuRows[0]?.tenant_user_id) {
    throw new Error(
      'seedPlatformTenantUserInviteProcess: no tenant_users row for created_by',
    );
  }

  const objectRows: Array<{ config_object_id: number }> = await queryRunner.query(
    `
    SELECT co.config_object_id
      FROM config_objects co
      JOIN config_template_sets ts
        ON ts.config_template_set_id = co.config_template_set_id
     WHERE ts.\`key\` = ?
       AND ts.tenant_id IS NULL
       AND co.object_type = 'tenant_user_invitation'
     LIMIT 1
    `,
    [TEMPLATE_SET_KEY],
  );
  if (!objectRows[0]?.config_object_id) {
    throw new Error(
      'seedPlatformTenantUserInviteProcess: missing tenant_user_invitation config object in platform_tenant_users. Apply db/seed_platform_tenant_users.sql first.',
    );
  }

  return {
    creatorTenantUserId: Number(tuRows[0].tenant_user_id),
    invitationConfigObjectId: Number(objectRows[0].config_object_id),
  };
}

async function findTemplateIdByName(
  queryRunner: QueryRunner,
  name: string,
): Promise<number | null> {
  const rows: Array<{ process_template_id: number }> = await queryRunner.query(
    `
    SELECT process_template_id
      FROM process_template_descriptions
     WHERE language_id = ?
       AND name = ?
     LIMIT 1
    `,
    [LANGUAGE_ID, name],
  );
  return rows[0]?.process_template_id
    ? Number(rows[0].process_template_id)
    : null;
}

async function insertTemplate(
  queryRunner: QueryRunner,
  ids: SeededIds,
  name: string,
  description: string,
): Promise<number> {
  const existing = await findTemplateIdByName(queryRunner, name);
  if (existing) {
    return existing;
  }

  await queryRunner.query(
    `
    INSERT INTO process_templates (
      tenant_id, created_by, updated_by, status, created_at, updated_at
    ) VALUES (0, ?, ?, 'PUBLISHED', NOW(6), NOW(6))
    `,
    [ids.creatorTenantUserId, ids.creatorTenantUserId],
  );
  const inserted: Array<{ id: number }> = await queryRunner.query(
    `SELECT LAST_INSERT_ID() AS id`,
  );
  const templateId = Number(inserted[0].id);

  await queryRunner.query(
    `
    INSERT INTO process_template_descriptions (
      process_template_id, language_id, name, description, created_at
    ) VALUES (?, ?, ?, ?, NOW(6))
    `,
    [templateId, LANGUAGE_ID, name, description],
  );

  return templateId;
}

async function insertStep(
  queryRunner: QueryRunner,
  ids: SeededIds,
  templateId: number,
  params: {
    order: number;
    name: string;
    description: string;
    assigneeSpec?: Record<string, unknown> | null;
  },
): Promise<number> {
  const existing: Array<{ process_template_step_id: number }> =
    await queryRunner.query(
      `
      SELECT pts.process_template_step_id
        FROM process_template_steps pts
        JOIN process_template_step_descriptions d
          ON d.process_template_step_id = pts.process_template_step_id
       WHERE pts.process_template_id = ?
         AND pts.step_order = ?
         AND d.language_id = ?
         AND d.name = ?
       LIMIT 1
      `,
      [templateId, params.order, LANGUAGE_ID, params.name],
    );
  if (existing[0]?.process_template_step_id) {
    return Number(existing[0].process_template_step_id);
  }

  await queryRunner.query(
    `
    INSERT INTO process_template_steps (
      process_template_id,
      task_type,
      step_order,
      is_optional,
      assignee_spec,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (?, 'manual', ?, 0, CAST(? AS JSON), ?, ?, NOW(6), NOW(6))
    `,
    [
      templateId,
      params.order,
      params.assigneeSpec ? JSON.stringify(params.assigneeSpec) : null,
      ids.creatorTenantUserId,
      ids.creatorTenantUserId,
    ],
  );
  const inserted: Array<{ id: number }> = await queryRunner.query(
    `SELECT LAST_INSERT_ID() AS id`,
  );
  const stepId = Number(inserted[0].id);

  await queryRunner.query(
    `
    INSERT INTO process_template_step_descriptions (
      process_template_step_id, language_id, name, description, created_at
    ) VALUES (?, ?, ?, ?, NOW(6))
    `,
    [stepId, LANGUAGE_ID, params.name, params.description],
  );

  return stepId;
}

async function insertBinding(
  queryRunner: QueryRunner,
  ids: SeededIds,
  stepId: number,
  configObjectId: number,
  bindingMode: 'create_on_enter' | 'use_existing',
  orderIndex = 0,
): Promise<void> {
  await queryRunner.query(
    `
    INSERT INTO process_template_step_object_bindings (
      process_template_step_id,
      config_object_id,
      binding_mode,
      is_mandatory,
      completion_rule,
      order_index,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    SELECT ?, ?, ?, 1, CAST(? AS JSON), ?, ?, ?, NOW(6), NOW(6)
    WHERE NOT EXISTS (
      SELECT 1
        FROM process_template_step_object_bindings
       WHERE process_template_step_id = ?
         AND config_object_id = ?
    )
    `,
    [
      stepId,
      configObjectId,
      bindingMode,
      JSON.stringify(DEFAULT_COMPLETION_RULE),
      orderIndex,
      ids.creatorTenantUserId,
      ids.creatorTenantUserId,
      stepId,
      configObjectId,
    ],
  );
}
