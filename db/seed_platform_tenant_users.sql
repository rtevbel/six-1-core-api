--
-- Global tenant users template set (tenant_id NULL, PUBLISHED).
-- Object Designer + Object Runner replace the hardcoded /tenant/users screen.
-- Mirror of platform_tenant_settings for memberships and per-user prefs.
--
-- Apply: mysql … < db/seed_platform_tenant_users.sql
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
  'platform_tenant_users',
  'Tenant users',
  'Tenant memberships, roles, invitations, per-user configuration, working hours, off days, and meta.',
  'PUBLISHED',
  @creator_tu,
  @creator_tu,
  NOW(6),
  NOW(6)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_users'
);

UPDATE `config_template_sets`
SET
  `name` = 'Tenant users',
  `description` = 'Tenant memberships, roles, invitations, per-user configuration, working hours, off days, and meta.',
  `status` = 'PUBLISHED',
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_users';

SET @ts_id := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_users' LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`, `object_type`, `binding_mode`, `sor_table_name`,
  `display_name`, `description`, `status`, `created_at`, `updated_at`
) VALUES
  (@ts_id, 'tenant_user', 'system_table', 'tenant_users', 'Tenant user', 'Membership linking a user to a tenant', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_configuration', 'system_table', 'tenant_user_configurations', 'User configuration', 'Per-user timezone, locale, and preferences', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_working_hour', 'system_table', 'tenant_user_working_hours', 'User working hours', 'Per-user weekly hours', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_off_day', 'system_table', 'tenant_user_off_days', 'User off days', 'Per-user holidays / off days', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_meta', 'system_table', 'tenant_user_meta', 'User meta', 'Per-user key-value preferences', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_role', 'system_table', 'tenant_user_roles', 'User roles', 'Role assignments for a tenant user', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_user_invitation', 'system_table', 'tenant_user_invitations', 'User invitations', 'Pending invitations into the tenant', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @obj_tu := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user' LIMIT 1);
SET @obj_tu_cfg := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_configuration' LIMIT 1);
SET @obj_tu_hours := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_working_hour' LIMIT 1);
SET @obj_tu_off := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_off_day' LIMIT 1);
SET @obj_tu_meta := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_meta' LIMIT 1);
SET @obj_tu_role := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_role' LIMIT 1);
SET @obj_tu_inv := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_user_invitation' LIMIT 1);

INSERT INTO `config_object_relationships` (
  `from_object_type`, `to_object_type`, `relationship_key`, `display_name`,
  `cardinality`, `query_config`, `is_active`
) VALUES
  ('tenant', 'tenant_user', 'tenant_user', 'Tenant users', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_users', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_user_invitation', 'tenant_user_invitation', 'User invitations', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_invitations', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant_user', 'tenant_user_configuration', 'tenant_user_configuration', 'User configuration', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_configurations', 'foreign_key', 'tenant_user_id', 'local_key', 'tenant_user_id'), 1),
  ('tenant_user', 'tenant_user_working_hour', 'tenant_user_working_hour', 'User working hours', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_working_hours', 'foreign_key', 'tenant_user_id', 'local_key', 'tenant_user_id'), 1),
  ('tenant_user', 'tenant_user_off_day', 'tenant_user_off_day', 'User off days', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_off_days', 'foreign_key', 'tenant_user_id', 'local_key', 'tenant_user_id'), 1),
  ('tenant_user', 'tenant_user_meta', 'tenant_user_meta', 'User meta', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_meta', 'foreign_key', 'tenant_user_id', 'local_key', 'tenant_user_id'), 1),
  ('tenant_user', 'tenant_user_role', 'tenant_user_role', 'User roles', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_user_roles', 'foreign_key', 'tenant_user_id', 'local_key', 'tenant_user_id'), 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

-- Related lists use panel layout relationPanelMode; do not persist a sparse
-- relation_manifest_json here (it would hide gateway listRef/list path).
UPDATE `config_object_relationships`
SET `relation_manifest_json` = NULL
WHERE `from_object_type` = 'tenant_user'
  AND `relationship_key` IN (
    'tenant_user_configuration',
    'tenant_user_working_hour',
    'tenant_user_off_day',
    'tenant_user_meta',
    'tenant_user_role'
  );

INSERT INTO `config_object_views` (
  `config_object_id`, `view_key`, `view_type`, `name`, `description`,
  `role_key`, `is_default`, `config_json`
) VALUES
  (@obj_tu, 'tenant_users_list', 'list', 'Tenant users - List', 'Memberships', NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'Tenant users',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'userId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'statusId', 'label', 'Status'),
          JSON_OBJECT('field', 'createdBy', 'label', 'Created by'),
          JSON_OBJECT('field', 'tenantUserId', 'label', 'Membership ID')
        ),
        'defaultSort', JSON_OBJECT('field', 'tenantUserId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'statusId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Status', 'section', 'Membership')),
          JSON_OBJECT('source', 'core', 'field', 'userId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Membership'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New tenant user'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu, 'tenant_users_form', 'form', 'Tenant user - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_user_fields'))),
  (@obj_tu, 'tenant_users_detail', 'detail', 'Tenant user - Detail', 'Membership and related prefs', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'tenant_user_main', 'tu_config', 'tu_hours', 'tu_off', 'tu_roles', 'tu_meta'
    ))),

  (@obj_tu_cfg, 'tu_config_list', 'list', 'User configuration - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User configuration',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'timezone', 'label', 'Timezone'),
          JSON_OBJECT('field', 'languageId', 'label', 'Language'),
          JSON_OBJECT('field', 'defaultCurrency', 'label', 'Currency'),
          JSON_OBJECT('field', 'weekStartDay', 'label', 'Week starts'),
          JSON_OBJECT('field', 'dateFormat', 'label', 'Date format'),
          JSON_OBJECT('field', 'timeFormat', 'label', 'Time format'),
          JSON_OBJECT('field', 'notificationPreferences', 'label', 'Notification preferences')
        ),
        'defaultSort', JSON_OBJECT('field', 'tenantUserId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Preferences')),
          JSON_OBJECT('source', 'core', 'field', 'timezone', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Timezone', 'section', 'Preferences')),
          JSON_OBJECT('source', 'core', 'field', 'languageId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Language', 'section', 'Preferences'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New configuration'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_cfg, 'tu_config_form', 'form', 'User configuration - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_config_fields'))),
  (@obj_tu_cfg, 'tu_config_detail', 'detail', 'User configuration - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_config_detail_main'))),

  (@obj_tu_hours, 'tu_hours_list', 'list', 'User working hours - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User working hours',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'dayOfWeek', 'label', 'Day'),
          JSON_OBJECT('field', 'startTime', 'label', 'Start time'),
          JSON_OBJECT('field', 'endTime', 'label', 'End time')
        ),
        'defaultSort', JSON_OBJECT('field', 'dayOfWeek', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Schedule')),
          JSON_OBJECT('source', 'core', 'field', 'dayOfWeek', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Day', 'section', 'Schedule'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New working hours'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_hours, 'tu_hours_form', 'form', 'User working hours - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_hours_fields'))),
  (@obj_tu_hours, 'tu_hours_detail', 'detail', 'User working hours - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_hours_detail_main'))),

  (@obj_tu_off, 'tu_off_list', 'list', 'User off days - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User off days',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'offDate', 'label', 'Date'),
          JSON_OBJECT('field', 'description', 'label', 'Description')
        ),
        'defaultSort', JSON_OBJECT('field', 'offDate', 'direction', 'desc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Schedule')),
          JSON_OBJECT('source', 'core', 'field', 'offDate', 'operator', 'gte', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'From date', 'section', 'Schedule')),
          JSON_OBJECT('source', 'core', 'field', 'description', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Description', 'section', 'Schedule'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New off day'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_off, 'tu_off_form', 'form', 'User off day - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_off_fields'))),
  (@obj_tu_off, 'tu_off_detail', 'detail', 'User off day - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_off_detail_main'))),

  (@obj_tu_meta, 'tu_meta_list', 'list', 'User meta - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User meta',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'metaKey', 'label', 'Key'),
          JSON_OBJECT('field', 'metaValue', 'label', 'Value')
        ),
        'defaultSort', JSON_OBJECT('field', 'metaKey', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Meta')),
          JSON_OBJECT('source', 'core', 'field', 'metaKey', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Key', 'section', 'Meta'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'New meta entry'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_meta, 'tu_meta_form', 'form', 'User meta - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_meta_fields'))),
  (@obj_tu_meta, 'tu_meta_detail', 'detail', 'User meta - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_meta_detail_main'))),

  (@obj_tu_role, 'tu_role_list', 'list', 'User roles - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User roles',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'tenantUserId', 'label', 'User', 'displayField', TRUE),
          JSON_OBJECT('field', 'roleId', 'label', 'Role'),
          JSON_OBJECT('field', 'createdBy', 'label', 'Assigned by')
        ),
        'defaultSort', JSON_OBJECT('field', 'roleId', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'tenantUserId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'User', 'section', 'Access')),
          JSON_OBJECT('source', 'core', 'field', 'roleId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Role', 'section', 'Access'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'create', 'label', 'Assign role'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_role, 'tu_role_form', 'form', 'User role - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_role_fields'))),
  (@obj_tu_role, 'tu_role_detail', 'detail', 'User role - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_role_detail_main'))),

  (@obj_tu_inv, 'tu_inv_list', 'list', 'User invitations - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'title', 'User invitations',
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'email', 'label', 'Email', 'displayField', TRUE),
          JSON_OBJECT('field', 'status', 'label', 'Status'),
          JSON_OBJECT('field', 'roleId', 'label', 'Role'),
          JSON_OBJECT('field', 'invitedBy', 'label', 'Invited by'),
          JSON_OBJECT('field', 'expiresAt', 'label', 'Expires')
        ),
        'defaultSort', JSON_OBJECT('field', 'email', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'email', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Email', 'section', 'Invitation')),
          JSON_OBJECT('source', 'core', 'field', 'status', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Status', 'section', 'Invitation')),
          JSON_OBJECT('source', 'core', 'field', 'roleId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Role', 'section', 'Invitation'))
        ),
        'actions', JSON_ARRAY(
          JSON_OBJECT('bindingKey', 'invite', 'label', 'Invite user'),
          JSON_OBJECT('bindingKey', 'resend', 'label', 'Resend'),
          JSON_OBJECT('bindingKey', 'delete', 'label', 'Delete record')
        )
      )
    )),
  (@obj_tu_inv, 'tu_inv_form', 'form', 'User invitation - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_inv_fields'))),
  (@obj_tu_inv, 'tu_inv_detail', 'detail', 'User invitation - Detail', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tu_inv_detail_main')))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`),
  `config_json` = VALUES(`config_json`);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
) VALUES
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_form' LIMIT 1),
    'tenant_user_fields', 'Membership', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Membership',
        'fields', JSON_ARRAY('userId', 'statusId'),
        'fieldConfigByKey', JSON_OBJECT(
          'userId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tenant_user_main', 'Membership', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('userId', 'statusId', 'tenantUserId'),
        'fieldLabelByKey', JSON_OBJECT(
          'userId', 'User',
          'statusId', 'Status',
          'tenantUserId', 'Membership ID'),
        'sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Membership',
          'fields', JSON_ARRAY('userId', 'statusId', 'tenantUserId'),
          'fieldConfigByKey', JSON_OBJECT(
            'userId', JSON_OBJECT('inputType', 'auto', 'label', 'User', 'readonly', TRUE),
            'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status'),
            'tenantUserId', JSON_OBJECT('inputType', 'text', 'label', 'Membership ID', 'readonly', TRUE)))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tu_config', 'User configuration', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'notificationPreferences'),
        'fieldLabelByKey', JSON_OBJECT(
          'timezone', 'Timezone',
          'languageId', 'Language',
          'defaultCurrency', 'Currency',
          'weekStartDay', 'Week starts',
          'dateFormat', 'Date format',
          'timeFormat', 'Time format',
          'notificationPreferences', 'Notification preferences'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_user_configuration',
        'targetEntityKey', 'tenant_user_configuration',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Configuration',
          'fields', JSON_ARRAY('timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'notificationPreferences'),
          'fieldConfigByKey', JSON_OBJECT(
            'timezone', JSON_OBJECT('inputType', 'timezone', 'label', 'Timezone'),
            'languageId', JSON_OBJECT('inputType', 'auto', 'label', 'Language'),
            'defaultCurrency', JSON_OBJECT('inputType', 'text', 'label', 'Currency'),
            'weekStartDay', JSON_OBJECT('inputType', 'select', 'label', 'Week starts', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'dateFormat', JSON_OBJECT('inputType', 'dateformat', 'label', 'Date format'),
            'timeFormat', JSON_OBJECT('inputType', 'timeformat', 'label', 'Time format'),
            'notificationPreferences', JSON_OBJECT('inputType', 'multiselect', 'label', 'Notification preferences', 'optionsText', 'email,sms,push,in_app,none'))))))), 2),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tu_hours', 'Working hours', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('dayOfWeek', 'startTime', 'endTime'),
        'fieldLabelByKey', JSON_OBJECT(
          'dayOfWeek', 'Day',
          'startTime', 'Start time',
          'endTime', 'End time'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_user_working_hour',
        'targetEntityKey', 'tenant_user_working_hour',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Working hours',
          'fields', JSON_ARRAY('dayOfWeek', 'startTime', 'endTime'),
          'fieldConfigByKey', JSON_OBJECT(
            'dayOfWeek', JSON_OBJECT('inputType', 'select', 'label', 'Day', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'startTime', JSON_OBJECT('inputType', 'time', 'label', 'Start time'),
            'endTime', JSON_OBJECT('inputType', 'time', 'label', 'End time'))))))), 3),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tu_off', 'Off days', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('offDate', 'description'),
        'fieldLabelByKey', JSON_OBJECT(
          'offDate', 'Date',
          'description', 'Description'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_user_off_day',
        'targetEntityKey', 'tenant_user_off_day',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Off day',
          'fields', JSON_ARRAY('offDate', 'description'),
          'fieldConfigByKey', JSON_OBJECT(
            'offDate', JSON_OBJECT('inputType', 'date', 'label', 'Date'),
            'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description'))))))), 4),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tu_roles', 'Roles', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('roleId', 'createdBy'),
        'fieldLabelByKey', JSON_OBJECT(
          'roleId', 'Role',
          'createdBy', 'Assigned by'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_user_role',
        'targetEntityKey', 'tenant_user_role',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Role',
          'fields', JSON_ARRAY('roleId'),
          'fieldConfigByKey', JSON_OBJECT(
            'roleId', JSON_OBJECT('inputType', 'auto', 'label', 'Role'))))))), 5),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu AND `view_key` = 'tenant_users_detail' LIMIT 1),
    'tu_meta', 'Meta', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('metaKey', 'metaValue'),
        'fieldLabelByKey', JSON_OBJECT(
          'metaKey', 'Key',
          'metaValue', 'Value'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_user_meta',
        'targetEntityKey', 'tenant_user_meta',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Meta',
          'fields', JSON_ARRAY('metaKey', 'metaValue'),
          'fieldConfigByKey', JSON_OBJECT(
            'metaKey', JSON_OBJECT('inputType', 'text', 'label', 'Key'),
            'metaValue', JSON_OBJECT('inputType', 'textarea', 'label', 'Value'))))))), 6),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_cfg AND `view_key` = 'tu_config_form' LIMIT 1),
    'tu_config_fields', 'Configuration', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Configuration',
        'fields', JSON_ARRAY('tenantUserId', 'timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'notificationPreferences'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'timezone', JSON_OBJECT('inputType', 'timezone', 'label', 'Timezone'),
          'languageId', JSON_OBJECT('inputType', 'auto', 'label', 'Language'),
          'defaultCurrency', JSON_OBJECT('inputType', 'text', 'label', 'Currency'),
          'weekStartDay', JSON_OBJECT('inputType', 'select', 'label', 'Week starts', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
          'dateFormat', JSON_OBJECT('inputType', 'dateformat', 'label', 'Date format'),
          'timeFormat', JSON_OBJECT('inputType', 'timeformat', 'label', 'Time format'),
          'notificationPreferences', JSON_OBJECT('inputType', 'multiselect', 'label', 'Notification preferences', 'optionsText', 'email,sms,push,in_app,none')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_hours AND `view_key` = 'tu_hours_form' LIMIT 1),
    'tu_hours_fields', 'Working hours', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Working hours',
        'fields', JSON_ARRAY('tenantUserId', 'dayOfWeek', 'startTime', 'endTime'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'dayOfWeek', JSON_OBJECT('inputType', 'select', 'label', 'Day', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
          'startTime', JSON_OBJECT('inputType', 'time', 'label', 'Start time'),
          'endTime', JSON_OBJECT('inputType', 'time', 'label', 'End time')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_off AND `view_key` = 'tu_off_form' LIMIT 1),
    'tu_off_fields', 'Off day', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Off day',
        'fields', JSON_ARRAY('tenantUserId', 'offDate', 'description'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'offDate', JSON_OBJECT('inputType', 'date', 'label', 'Date'),
          'description', JSON_OBJECT('inputType', 'textarea', 'label', 'Description')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_meta AND `view_key` = 'tu_meta_form' LIMIT 1),
    'tu_meta_fields', 'Meta', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Meta',
        'fields', JSON_ARRAY('tenantUserId', 'metaKey', 'metaValue'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'metaKey', JSON_OBJECT('inputType', 'text', 'label', 'Key'),
          'metaValue', JSON_OBJECT('inputType', 'textarea', 'label', 'Value')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_role AND `view_key` = 'tu_role_form' LIMIT 1),
    'tu_role_fields', 'Role', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Role',
        'fields', JSON_ARRAY('tenantUserId', 'roleId'),
        'fieldConfigByKey', JSON_OBJECT(
          'tenantUserId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'roleId', JSON_OBJECT('inputType', 'auto', 'label', 'Role')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_inv AND `view_key` = 'tu_inv_form' LIMIT 1),
    'tu_inv_fields', 'Invitation', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Invitation',
        'fields', JSON_ARRAY('email', 'roleId', 'expiresAt'),
        'fieldConfigByKey', JSON_OBJECT(
          'email', JSON_OBJECT('inputType', 'email', 'label', 'Email', 'required', TRUE),
          'roleId', JSON_OBJECT('inputType', 'auto', 'label', 'Role', 'required', TRUE),
          'expiresAt', JSON_OBJECT('inputType', 'date', 'label', 'Expires')))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_cfg AND `view_key` = 'tu_config_detail' LIMIT 1),
    'tu_config_detail_main', 'Configuration', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'notificationPreferences'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'timezone', 'Timezone',
          'languageId', 'Language',
          'defaultCurrency', 'Currency',
          'weekStartDay', 'Week starts',
          'dateFormat', 'Date format',
          'timeFormat', 'Time format',
          'notificationPreferences', 'Notification preferences'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_hours AND `view_key` = 'tu_hours_detail' LIMIT 1),
    'tu_hours_detail_main', 'Working hours', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'dayOfWeek', 'startTime', 'endTime'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'dayOfWeek', 'Day',
          'startTime', 'Start time',
          'endTime', 'End time'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_off AND `view_key` = 'tu_off_detail' LIMIT 1),
    'tu_off_detail_main', 'Off day', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'offDate', 'description'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'offDate', 'Date',
          'description', 'Description'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_meta AND `view_key` = 'tu_meta_detail' LIMIT 1),
    'tu_meta_detail_main', 'Meta', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'metaKey', 'metaValue'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'metaKey', 'Key',
          'metaValue', 'Value'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_role AND `view_key` = 'tu_role_detail' LIMIT 1),
    'tu_role_detail_main', 'Role', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('tenantUserId', 'roleId', 'createdBy'),
        'fieldLabelByKey', JSON_OBJECT(
          'tenantUserId', 'User',
          'roleId', 'Role',
          'createdBy', 'Assigned by'))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tu_inv AND `view_key` = 'tu_inv_detail' LIMIT 1),
    'tu_inv_detail_main', 'Invitation', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('columns', JSON_ARRAY('email', 'status', 'roleId', 'invitedBy', 'expiresAt'),
        'fieldLabelByKey', JSON_OBJECT(
          'email', 'Email',
          'status', 'Status',
          'roleId', 'Role',
          'invitedBy', 'Invited by',
          'expiresAt', 'Expires'))), 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

INSERT INTO `config_object_runtime_field_metadata` (
  `config_object_id`, `field_key`, `validation_json`, `rules_json`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
  (@obj_tu, 'userId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu, 'statusId',
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
  (@obj_tu, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_cfg, 'languageId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'core.system_language.list',
        'valueKey', 'languageId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_cfg, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_cfg, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_role, 'roleId',
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
  (@obj_tu_role, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_role, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_inv, 'roleId',
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
  (@obj_tu_cfg, 'tenantUserId',
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
  (@obj_tu_hours, 'tenantUserId',
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
  (@obj_tu_hours, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_hours, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_off, 'tenantUserId',
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
  (@obj_tu_off, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_off, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_meta, 'tenantUserId',
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
  (@obj_tu_meta, 'createdBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_meta, 'updatedBy',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tu_role, 'tenantUserId',
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
  (@obj_tu_inv, 'invitedBy',
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

-- Organisation detail: Users related list (platform_tenant_settings pack).
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
  'tenant_users',
  'Users',
  'table',
  JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
    'layout', JSON_OBJECT(
      'columns', JSON_ARRAY('userId', 'statusId'),
      'fieldLabelByKey', JSON_OBJECT(
        'userId', 'User',
        'statusId', 'Status'),
      'dataBinding', 'relation',
      'relationKey', 'tenant_user',
      'targetEntityKey', 'tenant_user',
      'relationPanelMode', 'related_list',
      'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Tenant user',
        'fields', JSON_ARRAY('userId', 'statusId'),
        'fieldConfigByKey', JSON_OBJECT(
          'userId', JSON_OBJECT('inputType', 'auto', 'label', 'User'),
          'statusId', JSON_OBJECT('inputType', 'auto', 'label', 'Status'))))))),
  9
FROM DUAL
WHERE @tenant_detail_view IS NOT NULL
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

UPDATE `config_object_views`
SET
  `config_json` = JSON_SET(
    COALESCE(`config_json`, JSON_OBJECT('schemaVersion', 1)),
    '$.schemaVersion', 1,
    '$.panels', JSON_ARRAY(
      'tenant_org', 'tenant_contact', 'tenant_billing', 'tenant_config',
      'tenant_hours', 'tenant_off', 'tenant_sub', 'tenant_meta',
      'tenant_users'
    )
  ),
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `config_object_view_id` = @tenant_detail_view
  AND (
    `config_json` IS NULL
    OR JSON_CONTAINS(`config_json`, JSON_QUOTE('tenant_users'), '$.panels') = 0
  );

SET FOREIGN_KEY_CHECKS = 1;
