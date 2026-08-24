import { QueryRunner } from 'typeorm';
import { PLATFORM_EVENT_NAMES } from '../../events/constants/platform-event-names.constants';
import { PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF } from '../../process_start_rules/constants';
import { DEFAULT_COMPLETION_RULE } from '../../automation/process-step-object-binding.constants';

const TEMPLATE_SET_KEY = 'industry_hvac_install';
const LANGUAGE_ID = 1;

const CUSTOMER_ONBOARDING_NAME = 'HVAC — Customer onboarding';
const INSTALL_JOB_NAME = 'HVAC — Install job';
const TENANT_ONBOARDING_NAME = 'HVAC — Tenant onboarding';

const DISPATCHER_SPEC = {
  type: 'tenant_role',
  roleName: 'Admin',
};
const CREW_SPEC = {
  type: 'tenant_role',
  roleName: 'Member',
};

type BindingMode = 'create_on_enter' | 'use_existing';

interface SeededIds {
  creatorTenantUserId: number;
  creatorUserId: number;
  objects: Record<string, number>;
}

/**
 * Idempotent HVAC process templates keyed by English description name.
 */
export async function seedIndustryHvacInstallProcesses(
  queryRunner: QueryRunner,
): Promise<void> {
  const ids = await resolveIds(queryRunner);

  await seedCustomerOnboarding(queryRunner, ids);
  await seedInstallJob(queryRunner, ids);
  await seedTenantOnboarding(queryRunner, ids);
}

async function resolveIds(queryRunner: QueryRunner): Promise<SeededIds> {
  const tuRows: Array<{ tenant_user_id: number }> = await queryRunner.query(`
    SELECT tenant_user_id FROM tenant_users ORDER BY tenant_user_id ASC LIMIT 1
  `);
  if (!tuRows[0]?.tenant_user_id) {
    throw new Error(
      'seedIndustryHvacInstallProcesses: no tenant_users row for created_by',
    );
  }

  const userRows: Array<{ user_id: number }> = await queryRunner.query(`
    SELECT user_id FROM users WHERE username = 'system' LIMIT 1
  `);
  const fallbackUsers: Array<{ user_id: number }> = userRows[0]?.user_id
    ? userRows
    : await queryRunner.query(
        `SELECT user_id FROM users ORDER BY user_id ASC LIMIT 1`,
      );
  if (!fallbackUsers[0]?.user_id) {
    throw new Error(
      'seedIndustryHvacInstallProcesses: no users row for start-rule created_by',
    );
  }

  const objectTypes = [
    'customer',
    'project',
    'task',
    'scheduled_task',
    'hvac_site_survey',
    'hvac_install_checklist',
    'hvac_tenant_registration',
  ];
  const objects: Record<string, number> = {};
  for (const objectType of objectTypes) {
    const rows: Array<{ config_object_id: number }> = await queryRunner.query(
      `
      SELECT co.config_object_id
        FROM config_objects co
        JOIN config_template_sets ts
          ON ts.config_template_set_id = co.config_template_set_id
       WHERE ts.\`key\` = ?
         AND ts.tenant_id IS NULL
         AND co.object_type = ?
       LIMIT 1
      `,
      [TEMPLATE_SET_KEY, objectType],
    );
    if (!rows[0]?.config_object_id) {
      throw new Error(
        `seedIndustryHvacInstallProcesses: missing config object ${objectType} in ${TEMPLATE_SET_KEY}. Apply db/seed_industry_hvac_install.sql first.`,
      );
    }
    objects[objectType] = Number(rows[0].config_object_id);
  }

  return {
    creatorTenantUserId: Number(tuRows[0].tenant_user_id),
    creatorUserId: Number(fallbackUsers[0].user_id),
    objects,
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
    extensions?: Record<string, unknown> | null;
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
      step_extensions_json,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (?, 'manual', ?, 0, CAST(? AS JSON), CAST(? AS JSON), ?, ?, NOW(6), NOW(6))
    `,
    [
      templateId,
      params.order,
      params.assigneeSpec ? JSON.stringify(params.assigneeSpec) : null,
      params.extensions ? JSON.stringify(params.extensions) : null,
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
  bindingMode: BindingMode,
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

async function insertAction(
  queryRunner: QueryRunner,
  ids: SeededIds,
  stepId: number,
  actionType: string,
  config: Record<string, unknown>,
  runOn = 'step_completed',
): Promise<void> {
  await queryRunner.query(
    `
    INSERT INTO process_template_step_actions (
      process_template_step_id,
      action_type,
      run_on,
      config,
      order_index,
      is_active,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    SELECT ?, ?, ?, CAST(? AS JSON), 0, 1, ?, ?, NOW(6), NOW(6)
    WHERE NOT EXISTS (
      SELECT 1
        FROM process_template_step_actions
       WHERE process_template_step_id = ?
         AND action_type = ?
    )
    `,
    [
      stepId,
      actionType,
      runOn,
      JSON.stringify(config),
      ids.creatorTenantUserId,
      ids.creatorTenantUserId,
      stepId,
      actionType,
    ],
  );
}

async function seedCustomerOnboarding(
  queryRunner: QueryRunner,
  ids: SeededIds,
): Promise<void> {
  const templateId = await insertTemplate(
    queryRunner,
    ids,
    CUSTOMER_ONBOARDING_NAME,
    'Collect customer profile, send verification, and confirm email.',
  );

  const profile = await insertStep(queryRunner, ids, templateId, {
    order: 1,
    name: 'Customer profile',
    description: 'Create or confirm the HVAC customer record.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    profile,
    ids.objects.customer,
    'create_on_enter',
  );
  await insertAction(queryRunner, ids, profile, 'generate_verification_token', {
    objectType: 'customer',
    coreIdPath: 'context.customerId',
  });

  const verify = await insertStep(queryRunner, ids, templateId, {
    order: 2,
    name: 'Verify email',
    description: 'Wait until the customer verifies their email.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    verify,
    ids.objects.customer,
    'use_existing',
  );

  await insertStep(queryRunner, ids, templateId, {
    order: 3,
    name: 'Complete',
    description: 'Customer onboarding is complete.',
    assigneeSpec: DISPATCHER_SPEC,
  });
}

async function seedInstallJob(
  queryRunner: QueryRunner,
  ids: SeededIds,
): Promise<void> {
  const templateId = await insertTemplate(
    queryRunner,
    ids,
    INSTALL_JOB_NAME,
    'Confirm customer, survey site, schedule visit, install, and close the job.',
  );

  const confirm = await insertStep(queryRunner, ids, templateId, {
    order: 1,
    name: 'Confirm customer',
    description: 'Confirm the homeowner / account for this install.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    confirm,
    ids.objects.customer,
    'use_existing',
  );

  const survey = await insertStep(queryRunner, ids, templateId, {
    order: 2,
    name: 'Site survey',
    description: 'Capture load calc and site notes.',
    assigneeSpec: CREW_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    survey,
    ids.objects.hvac_site_survey,
    'create_on_enter',
  );

  const job = await insertStep(queryRunner, ids, templateId, {
    order: 3,
    name: 'Create / confirm install job',
    description: 'Confirm the install job record.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    job,
    ids.objects.project,
    'use_existing',
  );

  const schedule = await insertStep(queryRunner, ids, templateId, {
    order: 4,
    name: 'Schedule visit',
    description: 'Book the install visit window.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    schedule,
    ids.objects.scheduled_task,
    'create_on_enter',
  );

  const install = await insertStep(queryRunner, ids, templateId, {
    order: 5,
    name: 'Install + checklist',
    description: 'On-site work order plus commissioning checklist.',
    assigneeSpec: CREW_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    install,
    ids.objects.hvac_install_checklist,
    'create_on_enter',
    0,
  );
  await insertBinding(
    queryRunner,
    ids,
    install,
    ids.objects.task,
    'create_on_enter',
    1,
  );

  const close = await insertStep(queryRunner, ids, templateId, {
    order: 6,
    name: 'Commission and close',
    description: 'Mark the install job closed.',
    assigneeSpec: DISPATCHER_SPEC,
  });
  await insertBinding(
    queryRunner,
    ids,
    close,
    ids.objects.project,
    'use_existing',
  );
  await insertAction(queryRunner, ids, close, 'update_sor_field', {
    objectType: 'project',
    coreIdPath: 'subject.id',
    corePatch: { status: 'completed' },
  });
}

async function seedTenantOnboarding(
  queryRunner: QueryRunner,
  ids: SeededIds,
): Promise<void> {
  const templateId = await insertTemplate(
    queryRunner,
    ids,
    TENANT_ONBOARDING_NAME,
    'Register a company, verify the admin email, invite users, and confirm settings.',
  );

  const register = await insertStep(queryRunner, ids, templateId, {
    order: 1,
    name: 'Register company',
    description:
      'Create the tenant from the registration form. Skipped when the tenant already exists.',
    assigneeSpec: DISPATCHER_SPEC,
    extensions: {
      allowSkip: true,
      visibleWhen: { '!': [{ var: 'context.tenantId' }] },
    },
  });
  await insertBinding(
    queryRunner,
    ids,
    register,
    ids.objects.hvac_tenant_registration,
    'create_on_enter',
  );
  await insertAction(queryRunner, ids, register, 'onboard_tenant', {
    registrationObjectType: 'hvac_tenant_registration',
  });

  await insertStep(queryRunner, ids, templateId, {
    order: 2,
    name: 'Verify admin email',
    description:
      'Admin verifies email at /verify-tenant-user using the issued token.',
    assigneeSpec: DISPATCHER_SPEC,
  });

  await insertStep(queryRunner, ids, templateId, {
    order: 3,
    name: 'Invite first users',
    description:
      'Invite dispatchers and crew. Day-to-day user CRUD stays in Object Runner.',
    assigneeSpec: DISPATCHER_SPEC,
  });

  await insertStep(queryRunner, ids, templateId, {
    order: 4,
    name: 'Confirm settings',
    description:
      'Confirm timezone, currency, and branding in tenant settings.',
    assigneeSpec: DISPATCHER_SPEC,
  });

  await insertStep(queryRunner, ids, templateId, {
    order: 5,
    name: 'Ready',
    description: 'Tenant onboarding is complete.',
    assigneeSpec: DISPATCHER_SPEC,
  });

  await queryRunner.query(
    `
    INSERT INTO process_start_rules (
      tenant_id,
      event_name,
      filter_json,
      template_id,
      subject_type,
      subject_id_source,
      context_patch,
      priority,
      is_active,
      created_by,
      updated_by,
      created_at,
      updated_at
    )
    SELECT 0, ?, NULL, ?, 'workflow', ?, CAST(? AS JSON), 100, 1, ?, ?, NOW(6), NOW(6)
    WHERE NOT EXISTS (
      SELECT 1
        FROM process_start_rules
       WHERE tenant_id = 0
         AND event_name = ?
         AND template_id = ?
    )
    `,
    [
      PLATFORM_EVENT_NAMES.TENANT_CREATED,
      templateId,
      PROCESS_START_RULE_SUBJECT_ID_WORKFLOW_SELF,
      JSON.stringify({ tenantId: { path: 'entity.entityId' } }),
      ids.creatorUserId,
      ids.creatorUserId,
      PLATFORM_EVENT_NAMES.TENANT_CREATED,
      templateId,
    ],
  );
}
