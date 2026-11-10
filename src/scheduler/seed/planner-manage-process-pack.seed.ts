import { QueryRunner } from 'typeorm';
import { DEFAULT_COMPLETION_RULE } from '../../automation/process-step-object-binding.constants';
import { ManageRecordCategory } from '../constants';
import { getManageCategoryFields } from '../planning/planner-manage-fields';

export const PLANNER_MANAGE_TEMPLATE_SET_KEY = 'planner_manage';
export const PLANNER_MANAGE_LANGUAGE_ID = 1;

export type PlannerManagePackCategory = {
  category: ManageRecordCategory;
  objectType: string;
  processKey: string;
  processTemplateName: string;
  displayName: string;
  description: string;
};

/** Canonical Object Designer + Dynamic Process pack for Manage Planning. */
export const PLANNER_MANAGE_PACK: PlannerManagePackCategory[] = [
  {
    category: 'project',
    objectType: 'planner_manage_project',
    processKey: 'planner.manage.project',
    processTemplateName: 'Planner Manage — Project',
    displayName: 'Planner Manage Project',
    description:
      'Scenario-draft project for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
  {
    category: 'person',
    objectType: 'planner_manage_person',
    processKey: 'planner.manage.person',
    processTemplateName: 'Planner Manage — Person',
    displayName: 'Planner Manage Person',
    description:
      'Scenario-draft person for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
  {
    category: 'team',
    objectType: 'planner_manage_team',
    processKey: 'planner.manage.team',
    processTemplateName: 'Planner Manage — Team',
    displayName: 'Planner Manage Team',
    description:
      'Scenario-draft team for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
  {
    category: 'partner',
    objectType: 'planner_manage_partner',
    processKey: 'planner.manage.partner',
    processTemplateName: 'Planner Manage — Partner',
    displayName: 'Planner Manage Partner',
    description:
      'Scenario-draft partner for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
  {
    category: 'equipment',
    objectType: 'planner_manage_equipment',
    processKey: 'planner.manage.equipment',
    processTemplateName: 'Planner Manage — Equipment',
    displayName: 'Planner Manage Equipment',
    description:
      'Scenario-draft equipment for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
  {
    category: 'material',
    objectType: 'planner_manage_material',
    processKey: 'planner.manage.material',
    processTemplateName: 'Planner Manage — Material',
    displayName: 'Planner Manage Material',
    description:
      'Scenario-draft material for Manage Planning (Option A). Persist via Manage APIs until Commit.',
  },
];

const ADMIN_SPEC = { type: 'tenant_role', roleName: 'Admin' };

/**
 * Idempotent platform pack: template set + standalone objects/fields +
 * one published Dynamic Process per Manage category (object bound on step 1).
 */
export async function seedPlannerManageProcessPack(
  queryRunner: QueryRunner,
): Promise<void> {
  const creatorTenantUserId = await resolveCreatorTenantUserId(queryRunner);
  const templateSetId = await ensureTemplateSet(
    queryRunner,
    creatorTenantUserId,
  );

  for (const pack of PLANNER_MANAGE_PACK) {
    const configObjectId = await ensureConfigObject(
      queryRunner,
      templateSetId,
      pack,
    );
    await ensureFields(
      queryRunner,
      configObjectId,
      pack.category,
      creatorTenantUserId,
    );
    await ensureDefaultFormView(
      queryRunner,
      configObjectId,
      pack,
      creatorTenantUserId,
    );
    const templateId = await ensureProcessTemplate(
      queryRunner,
      creatorTenantUserId,
      pack,
    );
    const stepId = await ensureEditStep(
      queryRunner,
      creatorTenantUserId,
      templateId,
      pack,
    );
    await ensureBinding(
      queryRunner,
      creatorTenantUserId,
      stepId,
      configObjectId,
    );
  }
}

async function resolveCreatorTenantUserId(
  queryRunner: QueryRunner,
): Promise<number> {
  const rows: Array<{ tenant_user_id: number }> = await queryRunner.query(`
    SELECT tenant_user_id FROM tenant_users ORDER BY tenant_user_id ASC LIMIT 1
  `);
  if (!rows[0]?.tenant_user_id) {
    throw new Error(
      'seedPlannerManageProcessPack: no tenant_users row for created_by',
    );
  }
  return Number(rows[0].tenant_user_id);
}

async function ensureTemplateSet(
  queryRunner: QueryRunner,
  creatorTenantUserId: number,
): Promise<number> {
  const existing: Array<{ config_template_set_id: number }> =
    await queryRunner.query(
      `
      SELECT config_template_set_id
        FROM config_template_sets
       WHERE tenant_id IS NULL AND \`key\` = ?
       LIMIT 1
      `,
      [PLANNER_MANAGE_TEMPLATE_SET_KEY],
    );
  if (existing[0]?.config_template_set_id) {
    await queryRunner.query(
      `
      UPDATE config_template_sets
         SET name = ?,
             description = ?,
             status = 'PUBLISHED',
             updated_by = ?,
             updated_at = NOW(6)
       WHERE config_template_set_id = ?
      `,
      [
        'Planner Manage',
        'Object Designer + Dynamic Process pack for Manage Planning (scenario-draft categories).',
        creatorTenantUserId,
        Number(existing[0].config_template_set_id),
      ],
    );
    return Number(existing[0].config_template_set_id);
  }

  await queryRunner.query(
    `
    INSERT INTO config_template_sets (
      tenant_id, \`key\`, name, description, status,
      created_by, updated_by, created_at, updated_at
    ) VALUES (
      NULL, ?, 'Planner Manage',
      'Object Designer + Dynamic Process pack for Manage Planning (scenario-draft categories).',
      'PUBLISHED', ?, ?, NOW(6), NOW(6)
    )
    `,
    [
      PLANNER_MANAGE_TEMPLATE_SET_KEY,
      creatorTenantUserId,
      creatorTenantUserId,
    ],
  );
  const inserted: Array<{ id: number }> = await queryRunner.query(
    `SELECT LAST_INSERT_ID() AS id`,
  );
  return Number(inserted[0].id);
}

async function ensureConfigObject(
  queryRunner: QueryRunner,
  templateSetId: number,
  pack: PlannerManagePackCategory,
): Promise<number> {
  const existing: Array<{ config_object_id: number }> = await queryRunner.query(
    `
    SELECT config_object_id
      FROM config_objects
     WHERE config_template_set_id = ?
       AND object_type = ?
     LIMIT 1
    `,
    [templateSetId, pack.objectType],
  );
  if (existing[0]?.config_object_id) {
    await queryRunner.query(
      `
      UPDATE config_objects
         SET binding_mode = 'standalone',
             sor_table_name = NULL,
             display_name = ?,
             description = ?,
             status = 'PUBLISHED',
             updated_at = NOW(6)
       WHERE config_object_id = ?
      `,
      [
        pack.displayName,
        pack.description,
        Number(existing[0].config_object_id),
      ],
    );
    return Number(existing[0].config_object_id);
  }

  await queryRunner.query(
    `
    INSERT INTO config_objects (
      config_template_set_id, object_type, binding_mode, sor_table_name,
      display_name, description, status, created_at, updated_at
    ) VALUES (?, ?, 'standalone', NULL, ?, ?, 'PUBLISHED', NOW(6), NOW(6))
    `,
    [templateSetId, pack.objectType, pack.displayName, pack.description],
  );
  const inserted: Array<{ id: number }> = await queryRunner.query(
    `SELECT LAST_INSERT_ID() AS id`,
  );
  return Number(inserted[0].id);
}

function mapFieldType(
  dataType: string,
): { fieldType: string; validation: Record<string, unknown> } {
  switch (dataType) {
    case 'number':
    case 'integer':
      return { fieldType: 'number', validation: { type: 'number' } };
    case 'boolean':
      return { fieldType: 'boolean', validation: { type: 'boolean' } };
    case 'enum':
      return { fieldType: 'select', validation: { type: 'string' } };
    case 'datetime':
      return {
        fieldType: 'date',
        validation: { type: 'string', format: 'date-time' },
      };
    case 'string_array':
    case 'uuid_array':
      return { fieldType: 'json', validation: { type: 'array' } };
    default:
      return { fieldType: 'text', validation: { type: 'string' } };
  }
}

async function ensureFields(
  queryRunner: QueryRunner,
  configObjectId: number,
  category: ManageRecordCategory,
  creatorTenantUserId: number,
): Promise<void> {
  const fields = getManageCategoryFields(category);
  let order = 10;
  for (const f of fields) {
    const mapped = mapFieldType(f.dataType);
    const validation: Record<string, unknown> = { ...mapped.validation };
    if (f.maxLength) validation.maxLength = f.maxLength;
    if (f.enumValues?.length) validation.enum = f.enumValues;

    await queryRunner.query(
      `
      INSERT INTO config_object_fields (
        config_object_id, field_key, label, description, field_type,
        validation_json, default_value, is_required, is_system, order_index,
        section_key, created_by, updated_by, created_at, updated_at
      )
      SELECT ?, ?, ?, ?, ?, CAST(? AS JSON), NULL, ?, 1, ?, 'manage', ?, ?, NOW(6), NOW(6)
      WHERE NOT EXISTS (
        SELECT 1 FROM config_object_fields
         WHERE config_object_id = ? AND field_key = ?
      )
      `,
      [
        configObjectId,
        f.fieldKey,
        f.label,
        `Manage draft field (${f.path})`,
        mapped.fieldType,
        JSON.stringify(validation),
        f.required ? 1 : 0,
        order,
        creatorTenantUserId,
        creatorTenantUserId,
        configObjectId,
        f.fieldKey,
      ],
    );
    order += 10;
  }
}

async function ensureDefaultFormView(
  queryRunner: QueryRunner,
  configObjectId: number,
  pack: PlannerManagePackCategory,
  creatorTenantUserId: number,
): Promise<void> {
  const viewKey = 'form_default';
  const panelKey = 'manage_main';
  const fieldKeys = getManageCategoryFields(pack.category).map((f) => f.fieldKey);
  const layoutConfig = {
    schemaVersion: 1,
    displayMode: 'form-section',
    dataBinding: 'main',
    layout: {
      sections: [
        {
          title: pack.displayName,
          fields: fieldKeys,
        },
      ],
    },
  };
  const configJson = {
    schemaVersion: 1,
    panels: [panelKey],
  };

  const existing: Array<{ config_object_view_id: number }> =
    await queryRunner.query(
      `
      SELECT config_object_view_id
        FROM config_object_views
       WHERE config_object_id = ?
         AND view_key = ?
       LIMIT 1
      `,
      [configObjectId, viewKey],
    );

  let viewId: number;
  if (existing[0]?.config_object_view_id) {
    viewId = Number(existing[0].config_object_view_id);
    await queryRunner.query(
      `
      UPDATE config_object_views
         SET name = ?,
             description = ?,
             view_type = 'form',
             is_default = 1,
             is_active = 1,
             config_json = CAST(? AS JSON),
             updated_by = ?,
             updated_at = NOW(6)
       WHERE config_object_view_id = ?
      `,
      [
        `${pack.displayName} form`,
        `Default Manage Planning form for ${pack.objectType}.`,
        JSON.stringify(configJson),
        creatorTenantUserId,
        viewId,
      ],
    );
  } else {
    await queryRunner.query(
      `
      INSERT INTO config_object_views (
        config_object_id, view_key, view_type, name, description,
        role_key, is_default, tenant_id, is_active, config_json,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        ?, ?, 'form', ?, ?, NULL, 1, NULL, 1, CAST(? AS JSON),
        ?, ?, NOW(6), NOW(6)
      )
      `,
      [
        configObjectId,
        viewKey,
        `${pack.displayName} form`,
        `Default Manage Planning form for ${pack.objectType}.`,
        JSON.stringify(configJson),
        creatorTenantUserId,
        creatorTenantUserId,
      ],
    );
    const inserted: Array<{ id: number }> = await queryRunner.query(
      `SELECT LAST_INSERT_ID() AS id`,
    );
    viewId = Number(inserted[0].id);
  }

  const panelExisting: Array<{ config_object_view_panel_id: number }> =
    await queryRunner.query(
      `
      SELECT config_object_view_panel_id
        FROM config_object_view_panels
       WHERE config_object_view_id = ?
         AND panel_key = ?
       LIMIT 1
      `,
      [viewId, panelKey],
    );

  if (panelExisting[0]?.config_object_view_panel_id) {
    await queryRunner.query(
      `
      UPDATE config_object_view_panels
         SET title = ?,
             panel_type = 'form-section',
             layout_config = CAST(? AS JSON),
             order_index = 0
       WHERE config_object_view_panel_id = ?
      `,
      [
        'Details',
        JSON.stringify(layoutConfig),
        Number(panelExisting[0].config_object_view_panel_id),
      ],
    );
    return;
  }

  await queryRunner.query(
    `
    INSERT INTO config_object_view_panels (
      config_object_view_id, panel_key, title, panel_type,
      layout_config, order_index
    ) VALUES (?, ?, 'Details', 'form-section', CAST(? AS JSON), 0)
    `,
    [viewId, panelKey, JSON.stringify(layoutConfig)],
  );
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
    [PLANNER_MANAGE_LANGUAGE_ID, name],
  );
  return rows[0]?.process_template_id
    ? Number(rows[0].process_template_id)
    : null;
}

async function ensureProcessTemplate(
  queryRunner: QueryRunner,
  creatorTenantUserId: number,
  pack: PlannerManagePackCategory,
): Promise<number> {
  const existing = await findTemplateIdByName(
    queryRunner,
    pack.processTemplateName,
  );
  if (existing) {
    return existing;
  }

  await queryRunner.query(
    `
    INSERT INTO process_templates (
      tenant_id, created_by, updated_by, status, created_at, updated_at
    ) VALUES (0, ?, ?, 'PUBLISHED', NOW(6), NOW(6))
    `,
    [creatorTenantUserId, creatorTenantUserId],
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
    [
      templateId,
      PLANNER_MANAGE_LANGUAGE_ID,
      pack.processTemplateName,
      `${pack.description} processKey=${pack.processKey}`,
    ],
  );

  return templateId;
}

async function ensureEditStep(
  queryRunner: QueryRunner,
  creatorTenantUserId: number,
  templateId: number,
  pack: PlannerManagePackCategory,
): Promise<number> {
  const stepName = `Edit ${pack.displayName}`;
  const existing: Array<{ process_template_step_id: number }> =
    await queryRunner.query(
      `
      SELECT pts.process_template_step_id
        FROM process_template_steps pts
        JOIN process_template_step_descriptions d
          ON d.process_template_step_id = pts.process_template_step_id
       WHERE pts.process_template_id = ?
         AND pts.step_order = 1
         AND d.language_id = ?
         AND d.name = ?
       LIMIT 1
      `,
      [templateId, PLANNER_MANAGE_LANGUAGE_ID, stepName],
    );
  if (existing[0]?.process_template_step_id) {
    return Number(existing[0].process_template_step_id);
  }

  await queryRunner.query(
    `
    INSERT INTO process_template_steps (
      process_template_id, task_type, step_order, is_optional, assignee_spec,
      created_by, updated_by, created_at, updated_at
    ) VALUES (?, 'manual', 1, 0, CAST(? AS JSON), ?, ?, NOW(6), NOW(6))
    `,
    [
      templateId,
      JSON.stringify(ADMIN_SPEC),
      creatorTenantUserId,
      creatorTenantUserId,
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
    [
      stepId,
      PLANNER_MANAGE_LANGUAGE_ID,
      stepName,
      `Capture / edit scenario-draft ${pack.category} for Manage Planning.`,
    ],
  );

  return stepId;
}

async function ensureBinding(
  queryRunner: QueryRunner,
  creatorTenantUserId: number,
  stepId: number,
  configObjectId: number,
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
    SELECT ?, ?, 'create_on_enter', 1, CAST(? AS JSON), 0, ?, ?, NOW(6), NOW(6)
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
      JSON.stringify(DEFAULT_COMPLETION_RULE),
      creatorTenantUserId,
      creatorTenantUserId,
      stepId,
      configObjectId,
    ],
  );
}
