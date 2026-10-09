--
-- Global roles and permissions template set (tenant_id NULL, PUBLISHED).
-- Object Designer + Object Runner for roles, permissions, and role-permission membership.
--
-- Apply: mysql … < db/seed_platform_roles_permissions.sql
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
  'platform_roles_permissions',
  'Roles and permissions',
  'Platform roles, permissions, and role-permission assignments including tenant-team roles.',
  'PUBLISHED',
  @creator_tu,
  @creator_tu,
  NOW(6),
  NOW(6)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_roles_permissions'
);

UPDATE `config_template_sets`
SET
  `name` = 'Roles and permissions',
  `description` = 'Platform roles, permissions, and role-permission assignments including tenant-team roles.',
  `status` = 'PUBLISHED',
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `tenant_id` IS NULL AND `key` = 'platform_roles_permissions';

SET @ts_id := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_roles_permissions' LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`, `object_type`, `binding_mode`, `sor_table_name`,
  `display_name`, `description`, `status`, `created_at`, `updated_at`
) VALUES
  (@ts_id, 'role', 'system_table', 'roles', 'Role', 'Role definition, scope flags, and assigned permissions', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'permission', 'system_table', 'permissions', 'Permission', 'Named permission used by role membership', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @obj_role := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'role' LIMIT 1);
SET @obj_perm := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'permission' LIMIT 1);

INSERT INTO `config_object_relationships` (
  `from_object_type`, `to_object_type`, `relationship_key`, `display_name`,
  `cardinality`, `query_config`, `is_active`
) VALUES
  ('role', 'permission', 'role_permission', 'Permissions', 'many_to_many',
    JSON_OBJECT(
      'join_table', 'role_permissions',
      'join_local_key', 'role_id',
      'join_foreign_key', 'permission_id',
      'target_table', 'permissions'
    ), 1),
  ('permission', 'role', 'permission_role', 'Roles', 'many_to_many',
    JSON_OBJECT(
      'join_table', 'role_permissions',
      'join_local_key', 'permission_id',
      'join_foreign_key', 'role_id',
      'target_table', 'roles'
    ), 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

UPDATE `config_object_relationships`
SET `relation_manifest_json` = NULL
WHERE (`from_object_type` = 'role' AND `relationship_key` IN ('role_permission', 'role_permissions'))
   OR (`from_object_type` = 'permission' AND `relationship_key` IN ('permission_role', 'permission_roles'));

INSERT INTO `config_object_views` (
  `config_object_id`, `view_key`, `view_type`, `name`, `description`,
  `role_key`, `is_default`, `config_json`
) VALUES
  (@obj_role, 'roles_list', 'list', 'Roles - List', 'Role catalog', NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Roles',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Name', 'displayField', TRUE),
          JSON_OBJECT('field', 'tenantId', 'label', 'Tenant'),
          JSON_OBJECT('field', 'isTenantRole', 'label', 'Tenant role'),
          JSON_OBJECT('field', 'isTenantTeamRole', 'label', 'Team role'),
          JSON_OBJECT('field', 'isCustomerRole', 'label', 'Customer role'),
          JSON_OBJECT('field', 'statusId', 'label', 'Status'),
          JSON_OBJECT('field', 'roleId', 'label', 'Role ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'roleId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'isTenantRole', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Tenant role', 'section', 'Scope')),
          JSON_OBJECT('source', 'core', 'field', 'isTenantTeamRole', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Team role', 'section', 'Scope')),
          JSON_OBJECT('source', 'core', 'field', 'isCustomerRole', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Customer role', 'section', 'Scope')),
          JSON_OBJECT('source', 'core', 'field', 'statusId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Status', 'section', 'Scope'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New role'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_role, 'roles_form', 'form', 'Role - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('role_fields'))),
  (@obj_role, 'roles_detail', 'detail', 'Role - Detail', 'Role flags and assigned permissions', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('role_main', 'role_permissions'))),

  (@obj_perm, 'permissions_list', 'list', 'Permissions - List', 'Permission catalog', NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Permissions',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Name', 'displayField', TRUE),
          JSON_OBJECT('field', 'statusId', 'label', 'Status'),
          JSON_OBJECT('field', 'permissionId', 'label', 'Permission ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'permissionId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'statusId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Status', 'section', 'Permission'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New permission'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_perm, 'permissions_form', 'form', 'Permission - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('permission_fields'))),
  (@obj_perm, 'permissions_detail', 'detail', 'Permission - Detail', 'Permission and assigned roles', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('permission_main', 'permission_roles')))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`),
  `config_json` = VALUES(`config_json`);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
) VALUES
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_role AND `view_key` = 'roles_form' LIMIT 1),
    'role_fields', 'Role', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Role',
        'fields', JSON_ARRAY('name', 'description', 'statusId', 'tenantId', 'isTenantRole', 'isTenantTeamRole', 'isCustomerRole'),
        'fieldConfigByKey', JSON_OBJECT(
          'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'required', TRUE),
          'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description'),
          'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status'),
          'tenantId', JSON_OBJECT(
            'inputType', 'auto',
            'label', 'Tenant',
            'rulesJson', JSON_OBJECT(
              'when', JSON_OBJECT('isSuperAdmin', FALSE),
              'then', JSON_OBJECT('visible', FALSE)
            )
          ),
          'isTenantRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Tenant role'),
          'isTenantTeamRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Team role'),
          'isCustomerRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Customer role')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_role AND `view_key` = 'roles_detail' LIMIT 1),
    'role_main', 'Role', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY(
          'name', 'roleId', 'statusId', 'tenantId',
          'isTenantRole', 'isTenantTeamRole', 'isCustomerRole'
        ),
        'fieldLabelByKey', JSON_OBJECT(
          'name', 'Name',
          'roleId', 'Role ID',
          'statusId', 'Status',
          'tenantId', 'Tenant',
          'isTenantRole', 'Tenant role',
          'isTenantTeamRole', 'Team role',
          'isCustomerRole', 'Customer role'),
        'sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Role',
          'fields', JSON_ARRAY(
            'name', 'roleId', 'statusId', 'tenantId',
            'isTenantRole', 'isTenantTeamRole', 'isCustomerRole'
          ),
          'fieldConfigByKey', JSON_OBJECT(
            'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'readonly', TRUE),
            'roleId', JSON_OBJECT('inputType', 'text', 'label', 'Role ID', 'readonly', TRUE),
            'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status'),
            'tenantId', JSON_OBJECT(
              'inputType', 'auto',
              'label', 'Tenant',
              'rulesJson', JSON_OBJECT(
                'when', JSON_OBJECT('isSuperAdmin', FALSE),
                'then', JSON_OBJECT('visible', FALSE)
              )
            ),
            'isTenantRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Tenant role'),
            'isTenantTeamRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Team role'),
            'isCustomerRole', JSON_OBJECT('inputType', 'checkbox', 'label', 'Customer role')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_role AND `view_key` = 'roles_detail' LIMIT 1),
    'role_permissions', 'Permissions', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'permissionId'),
        'fieldLabelByKey', JSON_OBJECT(
          'name', 'Permission',
          'permissionId', 'Permission ID'),
        'dataBinding', 'relation',
        'relationKey', 'role_permission',
        'targetEntityKey', 'permission',
        'selectionControl', 'checkbox',
        'relationPanelMode', 'relation_membership'),
      'actions', JSON_OBJECT(
        'assignRef', 'six1:action:role.permissions.assign',
        'unassignRef', 'six1:action:role.permissions.unassign'
      )), 2),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_perm AND `view_key` = 'permissions_form' LIMIT 1),
    'permission_fields', 'Permission', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Permission',
        'fields', JSON_ARRAY('name', 'description', 'permissionGroup', 'statusId'),
        'fieldConfigByKey', JSON_OBJECT(
          'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'required', TRUE),
          'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description'),
          'permissionGroup', JSON_OBJECT('inputType', 'text', 'label', 'Group'),
          'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status', 'required', TRUE)))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_perm AND `view_key` = 'permissions_detail' LIMIT 1),
    'permission_main', 'Permission', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'permissionId', 'statusId'),
        'fieldLabelByKey', JSON_OBJECT(
          'name', 'Name',
          'permissionId', 'Permission ID',
          'statusId', 'Status'),
        'sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Permission',
          'fields', JSON_ARRAY('name', 'permissionId', 'statusId'),
          'fieldConfigByKey', JSON_OBJECT(
            'name', JSON_OBJECT('inputType', 'text', 'label', 'Name', 'readonly', TRUE),
            'permissionId', JSON_OBJECT('inputType', 'text', 'label', 'Permission ID', 'readonly', TRUE),
            'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_perm AND `view_key` = 'permissions_detail' LIMIT 1),
    'permission_roles', 'Roles', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'roleId'),
        'fieldLabelByKey', JSON_OBJECT(
          'name', 'Role',
          'roleId', 'Role ID'),
        'dataBinding', 'relation',
        'relationKey', 'permission_role',
        'targetEntityKey', 'role',
        'selectionControl', 'checkbox',
        'relationPanelMode', 'relation_membership'),
      'actions', JSON_OBJECT(
        'assignRef', 'six1:action:permission.roles.assign',
        'unassignRef', 'six1:action:permission.roles.unassign'
      )), 2)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

INSERT INTO `config_object_runtime_field_metadata` (
  `config_object_id`, `field_key`, `validation_json`, `rules_json`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
  (@obj_role, 'statusId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'core.system_status.list',
        'valueKey', 'statusId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_role, 'tenantId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant',
        'valueKey', 'tenantId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    JSON_OBJECT(
      'when', JSON_OBJECT('isSuperAdmin', FALSE),
      'then', JSON_OBJECT('visible', FALSE)
    ), @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_perm, 'statusId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'core.system_status.list',
        'valueKey', 'statusId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `validation_json` = VALUES(`validation_json`),
  `rules_json` = VALUES(`rules_json`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET FOREIGN_KEY_CHECKS = 1;
