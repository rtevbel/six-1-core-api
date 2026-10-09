--
-- Global tenant teams template set (tenant_id NULL, PUBLISHED).
-- Object Designer + Object Runner for tenant teams, members, and project assignments.
-- Mirror of platform_tenant_users for team management.
--
-- Apply: mysql … < db/seed_platform_tenant_teams.sql
-- Prerequisites: db/seed_platform_tenant_settings.sql (Organisation related list).
--

SET FOREIGN_KEY_CHECKS = 0;

SET @creator_tu := (
  SELECT `tenant_user_id` FROM `tenant_users` ORDER BY `tenant_user_id` ASC LIMIT 1
);

INSERT INTO `config_template_sets` (
  `tenant_id`, `key`, `name`, `description`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT
  NULL,
  'platform_tenant_teams',
  'Tenant teams',
  'Tenant teams, team members, and team project assignments.',
  'PUBLISHED',
  @creator_tu,
  @creator_tu,
  NOW(6),
  NOW(6)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_teams'
);

UPDATE `config_template_sets`
SET
  `name` = 'Tenant teams',
  `description` = 'Tenant teams, team members, and team project assignments.',
  `status` = 'PUBLISHED',
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_teams';

SET @ts_id := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_teams' LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`, `object_type`, `binding_mode`, `sor_table_name`,
  `display_name`, `description`, `status`, `created_at`, `updated_at`
) VALUES
  (@ts_id, 'tenant_team', 'system_table', 'tenant_teams', 'Tenant team', 'Crew or group within a tenant', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'team_member', 'system_table', 'tenant_team_members', 'Team member', 'Membership linking a tenant user to a team', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'team_project', 'system_table', 'tenant_team_projects', 'Team project', 'Project assigned to a tenant team', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @obj_team := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_team' LIMIT 1);
SET @obj_member := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'team_member' LIMIT 1);
SET @obj_project := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'team_project' LIMIT 1);

INSERT INTO `config_object_relationships` (
  `from_object_type`, `to_object_type`, `relationship_key`, `display_name`,
  `cardinality`, `query_config`, `is_active`
) VALUES
  ('tenant', 'tenant_team', 'tenant_team', 'Teams', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_teams', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant_team', 'team_member', 'team_member', 'Team members', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_team_members', 'foreign_key', 'tenant_team_id', 'local_key', 'tenant_team_id'), 1),
  ('tenant_team', 'team_project', 'team_project', 'Team projects', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_team_projects', 'foreign_key', 'tenant_team_id', 'local_key', 'tenant_team_id'), 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

UPDATE `config_object_relationships`
SET `relation_manifest_json` = NULL
WHERE (`from_object_type` = 'tenant' AND `relationship_key` = 'tenant_team')
   OR (`from_object_type` = 'tenant_team' AND `relationship_key` IN ('team_member', 'team_project'));

INSERT INTO `config_object_views` (
  `config_object_id`, `view_key`, `view_type`, `name`, `description`,
  `role_key`, `is_default`, `config_json`
) VALUES
  (@obj_team, 'tenant_teams_list', 'list', 'Tenant teams - List', 'Teams', NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Tenant teams',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Name', 'displayField', TRUE),
          JSON_OBJECT('field', 'teamIdentifier', 'label', 'Identifier'),
          JSON_OBJECT('field', 'description', 'label', 'Description'),
          JSON_OBJECT('field', 'tenantTeamId', 'label', 'Team ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'name', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Name', 'section', 'Team')),
          JSON_OBJECT('source', 'core', 'field', 'teamIdentifier', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Identifier', 'section', 'Team'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New team'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_team, 'tenant_teams_form', 'form', 'Tenant team - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_team_fields'))),
  (@obj_team, 'tenant_teams_detail', 'detail', 'Tenant team - Detail', 'Team members and projects', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'tenant_team_main', 'team_members', 'team_projects'
    ))),

  (@obj_member, 'team_member_list', 'list', 'Team members - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Team members',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'roleId', 'label', 'Team role'),
          JSON_OBJECT('field', 'tenantTeamId', 'label', 'Team'),
          JSON_OBJECT('field', 'tenantTeamMemberId', 'label', 'Membership ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'tenantTeamMemberId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Membership')),
          JSON_OBJECT('source', 'core', 'field', 'roleId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Team role', 'section', 'Membership'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'Add member'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_member, 'team_member_form', 'form', 'Team member - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('team_member_fields'))),
  (@obj_member, 'team_member_detail', 'detail', 'Team member - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('team_member_detail_main'))),

  (@obj_project, 'team_project_list', 'list', 'Team projects - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Team projects',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'projectId', 'label', 'Project', 'displayField', TRUE),
          JSON_OBJECT('field', 'tenantTeamId', 'label', 'Team'),
          JSON_OBJECT('field', 'createdBy', 'label', 'Assigned by'),
          JSON_OBJECT('field', 'teamProjectId', 'label', 'Assignment ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'teamProjectId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'projectId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Project', 'section', 'Assignment'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'Assign project'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_project, 'team_project_form', 'form', 'Team project - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('team_project_fields'))),
  (@obj_project, 'team_project_detail', 'detail', 'Team project - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('team_project_detail_main')))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`),
  `config_json` = VALUES(`config_json`);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
) VALUES
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_team AND `view_key` = 'tenant_teams_form' LIMIT 1),
    'tenant_team_fields', 'Team', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Team',
        'fields', JSON_ARRAY('name', 'description'),
        'fieldConfigByKey', JSON_OBJECT(
          'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'required', TRUE),
          'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_team AND `view_key` = 'tenant_teams_detail' LIMIT 1),
    'tenant_team_main', 'Team', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'teamIdentifier', 'description', 'tenantTeamId'),
        'fieldLabelByKey', JSON_OBJECT(
          'name', 'Name',
          'teamIdentifier', 'Identifier',
          'description', 'Description',
          'tenantTeamId', 'Team ID'),
        'sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Team',
          'fields', JSON_ARRAY('name', 'teamIdentifier', 'description', 'tenantTeamId'),
          'fieldConfigByKey', JSON_OBJECT(
            'name', JSON_OBJECT('inputType', 'text', 'label', 'Name'),
            'teamIdentifier', JSON_OBJECT('inputType', 'text', 'label', 'Identifier'),
            'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description'),
            'tenantTeamId', JSON_OBJECT('inputType', 'text', 'label', 'Team ID', 'readonly', TRUE)))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_team AND `view_key` = 'tenant_teams_detail' LIMIT 1),
    'team_members', 'Members', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('tenantUserId', 'roleId'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'roleId', 'Team role'),
        'dataBinding', 'relation',
        'relationKey', 'team_member',
        'targetEntityKey', 'team_member',
        'relationPanelMode', 'related_list',
        'createLabel', 'Add member',
        'updateLabel', 'Save member',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Member',
          'fields', JSON_ARRAY('tenantUserId', 'roleId'),
          'fieldConfigByKey', JSON_OBJECT(
            'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User', 'required', TRUE),
            'roleId', JSON_OBJECT('inputType', 'auto', 'label', 'Team role'))))))), 2),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_team AND `view_key` = 'tenant_teams_detail' LIMIT 1),
    'team_projects', 'Projects', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('projectId', 'createdBy'),
        'fieldLabelByKey', JSON_OBJECT(
          'projectId', 'Project',
          'createdBy', 'Assigned by'),
        'dataBinding', 'relation',
        'relationKey', 'team_project',
        'targetEntityKey', 'team_project',
        'relationPanelMode', 'related_list',
        'createLabel', 'Assign project',
        'updateLabel', 'Save assignment',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Project',
          'fields', JSON_ARRAY('projectId'),
          'fieldConfigByKey', JSON_OBJECT(
            'projectId', JSON_OBJECT('inputType', 'auto', 'label', 'Project', 'required', TRUE))))))), 3),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_member AND `view_key` = 'team_member_form' LIMIT 1),
    'team_member_fields', 'Member', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Member',
        'fields', JSON_ARRAY('tenantTeamId', 'tenantUserId', 'roleId'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantTeamId', JSON_OBJECT('inputType', 'auto', 'label', 'Team', 'required', TRUE),
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User', 'required', TRUE),
          'roleId', JSON_OBJECT('inputType', 'auto', 'label', 'Team role')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_member AND `view_key` = 'team_member_detail' LIMIT 1),
    'team_member_detail_main', 'Member', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'roleId', 'tenantTeamId', 'tenantTeamMemberId'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'roleId', 'Team role',
          'tenantTeamId', 'Team',
          'tenantTeamMemberId', 'Membership ID'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_project AND `view_key` = 'team_project_form' LIMIT 1),
    'team_project_fields', 'Project', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Project',
        'fields', JSON_ARRAY('tenantTeamId', 'projectId'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantTeamId', JSON_OBJECT('inputType', 'auto', 'label', 'Team', 'required', TRUE),
          'projectId', JSON_OBJECT('inputType', 'auto', 'label', 'Project', 'required', TRUE)))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_project AND `view_key` = 'team_project_detail' LIMIT 1),
    'team_project_detail_main', 'Project', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('projectId', 'tenantTeamId', 'createdBy', 'teamProjectId'),
        'fieldLabelByKey', JSON_OBJECT(
          'projectId', 'Project',
          'tenantTeamId', 'Team',
          'createdBy', 'Assigned by',
          'teamProjectId', 'Assignment ID'))), 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

INSERT INTO `config_object_runtime_field_metadata` (
  `config_object_id`, `field_key`, `validation_json`, `rules_json`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
  (@obj_team, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_user',
        'valueKey', 'tenantUserId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_team, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_user',
        'valueKey', 'tenantUserId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_member, 'tenantUserId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_user',
        'valueKey', 'tenantUserId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_member, 'roleId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:role',
        'valueKey', 'roleId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_member, 'tenantTeamId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_team',
        'valueKey', 'tenantTeamId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_project, 'projectId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_project',
        'valueKey', 'projectId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_project, 'tenantTeamId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_team',
        'valueKey', 'tenantTeamId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_project, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_user',
        'valueKey', 'tenantUserId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `validation_json` = VALUES(`validation_json`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

-- Organisation detail: Teams related list (platform_tenant_settings pack).
SET @ts_settings := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_settings' LIMIT 1
);
SET @obj_tenant := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ts_settings AND `object_type` = 'tenant' LIMIT 1
);
SET @tenant_detail_view := (
  SELECT `config_object_view_id` FROM `config_object_views`
  WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1
);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
)
SELECT
  @tenant_detail_view,
  'tenant_teams',
  'Teams',
  'table',
  JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
    'layout', JSON_OBJECT(
      'columns', JSON_ARRAY('name', 'teamIdentifier'),
      'fieldLabelByKey', JSON_OBJECT(
        'name', 'Name',
        'teamIdentifier', 'Identifier'),
      'dataBinding', 'relation',
      'relationKey', 'tenant_team',
      'targetEntityKey', 'tenant_team',
      'relationPanelMode', 'related_list',
      'createLabel', 'Add team',
      'updateLabel', 'Save team',
      'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Team',
        'fields', JSON_ARRAY('name', 'description'),
        'fieldConfigByKey', JSON_OBJECT(
          'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'required', TRUE),
          'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description'))))))),
  10
FROM DUAL
WHERE @tenant_detail_view IS NOT NULL
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

UPDATE `config_object_views`
SET
  `config_json` = JSON_OBJECT(
    'schemaVersion', 1,
    'panels', JSON_ARRAY(
      'tenant_org', 'tenant_contact', 'tenant_billing', 'tenant_config',
      'tenant_hours', 'tenant_off', 'tenant_sub', 'tenant_meta',
      'tenant_users', 'tenant_teams'
    )
  ),
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `config_object_view_id` = @tenant_detail_view;

SET FOREIGN_KEY_CHECKS = 1;
