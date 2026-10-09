--
-- Global tenant settings template set (tenant_id NULL, PUBLISHED).
-- Object Designer + Object Runner replace the hardcoded /tenant settings screen.
-- Manifests are compiled at runtime - this file does not write gateway manifests.
--
-- Apply: mysql … < db/seed_platform_tenant_settings.sql
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
  'platform_tenant_settings',
  'Tenant settings',
  'Organisation, billing, configuration, working hours, off days, subscription, and tenant meta.',
  'PUBLISHED',
  @creator_tu,
  @creator_tu,
  NOW(6),
  NOW(6)
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_settings'
);

UPDATE `config_template_sets`
SET
  `name` = 'Tenant settings',
  `description` = 'Organisation, billing, configuration, working hours, off days, subscription, and tenant meta.',
  `status` = 'PUBLISHED',
  `updated_by` = @creator_tu,
  `updated_at` = NOW(6)
WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_settings';

SET @ts_id := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'platform_tenant_settings' LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`, `object_type`, `binding_mode`, `sor_table_name`,
  `display_name`, `description`, `status`, `created_at`, `updated_at`
) VALUES
  (@ts_id, 'tenant', 'system_table', 'tenants', 'Organisation', 'Tenant organisation profile', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_contact_info', 'system_table', 'tenant_contact_info', 'Organisation contact', 'HQ contact and address', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_billing_info', 'system_table', 'tenant_billing_info', 'Billing', 'Billing contact and currency', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_configuration', 'system_table', 'tenant_configurations', 'Configuration', 'Timezone, locale, branding, defaults', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_working_hour', 'system_table', 'tenant_working_hours', 'Working hours', 'Weekly working hours', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_off_day', 'system_table', 'tenant_off_days', 'Off days', 'Company holidays / off days', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_subscription', 'system_table', 'tenant_subscriptions', 'Subscription', 'Plan and period', 'PUBLISHED', NOW(6), NOW(6)),
  (@ts_id, 'tenant_meta', 'system_table', 'tenant_meta', 'Preferences / notifications / security', 'Key-value tenant prefs', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @obj_tenant := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant' LIMIT 1);
SET @obj_contact := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_contact_info' LIMIT 1);
SET @obj_billing := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_billing_info' LIMIT 1);
SET @obj_config := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_configuration' LIMIT 1);
SET @obj_hours := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_working_hour' LIMIT 1);
SET @obj_off := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_off_day' LIMIT 1);
SET @obj_sub := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_subscription' LIMIT 1);
SET @obj_meta := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @ts_id AND `object_type` = 'tenant_meta' LIMIT 1);

INSERT INTO `config_object_relationships` (
  `from_object_type`, `to_object_type`, `relationship_key`, `display_name`,
  `cardinality`, `query_config`, `is_active`
) VALUES
  ('tenant', 'tenant_contact_info', 'tenant_contact_info', 'Organisation contact', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_contact_info', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_billing_info', 'tenant_billing_info', 'Billing', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_billing_info', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_configuration', 'tenant_configuration', 'Configuration', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_configurations', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_working_hour', 'tenant_working_hour', 'Working hours', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_working_hours', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_off_day', 'tenant_off_day', 'Off days', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_off_days', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_subscription', 'tenant_subscription', 'Subscription', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_subscriptions', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1),
  ('tenant', 'tenant_meta', 'tenant_meta', 'Preferences / notifications / security', 'one_to_many',
    JSON_OBJECT('sor_table', 'tenant_meta', 'foreign_key', 'tenant_id', 'local_key', 'tenant_id'), 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

INSERT INTO `config_object_views` (
  `config_object_id`, `view_key`, `view_type`, `name`, `description`,
  `role_key`, `is_default`, `config_json`
) VALUES
  (@obj_tenant, 'tenant_settings_list', 'list', 'Organisations - List', 'Tenant organisations', NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Name', 'displayField', TRUE),
          JSON_OBJECT('field', 'tenantIdentifier', 'label', 'Identifier'),
          JSON_OBJECT('field', 'tenantTypeId', 'label', 'Type'),
          JSON_OBJECT('field', 'statusId', 'label', 'Status')
        ),
        'defaultSort', JSON_OBJECT('field', 'name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_tenant, 'tenant_settings_detail', 'detail', 'Organisation - Detail', 'Settings and related records', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'tenant_org', 'tenant_contact', 'tenant_billing', 'tenant_config',
      'tenant_hours', 'tenant_off', 'tenant_sub', 'tenant_meta'))),
  (@obj_tenant, 'tenant_settings_form', 'form', 'Organisation - Form', 'Edit organisation', NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_org'))),

  (@obj_contact, 'tenant_contact_list', 'list', 'Contacts - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'email', 'label', 'Email', 'displayField', TRUE),
          JSON_OBJECT('field', 'phone', 'label', 'Phone'),
          JSON_OBJECT('field', 'city', 'label', 'City'),
          JSON_OBJECT('field', 'country', 'label', 'Country')
        ),
        'defaultSort', JSON_OBJECT('field', 'email', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_contact, 'tenant_contact_form', 'form', 'Contact - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_contact_fields'))),

  (@obj_billing, 'tenant_billing_list', 'list', 'Billing - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'billingEmail', 'label', 'Billing email', 'displayField', TRUE),
          JSON_OBJECT('field', 'billingPhone', 'label', 'Phone'),
          JSON_OBJECT('field', 'billingCurrency', 'label', 'Currency'),
          JSON_OBJECT('field', 'billingCity', 'label', 'City')
        ),
        'defaultSort', JSON_OBJECT('field', 'billingEmail', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_billing, 'tenant_billing_form', 'form', 'Billing - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_billing_fields'))),

  (@obj_config, 'tenant_config_list', 'list', 'Configuration - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'timezone', 'label', 'Timezone', 'displayField', TRUE),
          JSON_OBJECT('field', 'languageId', 'label', 'Language'),
          JSON_OBJECT('field', 'defaultCurrency', 'label', 'Currency'),
          JSON_OBJECT('field', 'weekStartDay', 'label', 'Week starts')
        ),
        'defaultSort', JSON_OBJECT('field', 'timezone', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_config, 'tenant_config_form', 'form', 'Configuration - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_config_fields'))),

  (@obj_hours, 'tenant_hours_list', 'list', 'Working hours - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'dayOfWeek', 'label', 'Day', 'displayField', TRUE),
          JSON_OBJECT('field', 'startTime', 'label', 'Start'),
          JSON_OBJECT('field', 'endTime', 'label', 'End')
        ),
        'defaultSort', JSON_OBJECT('field', 'dayOfWeek', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_hours, 'tenant_hours_form', 'form', 'Working hours - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_hours_fields'))),

  (@obj_off, 'tenant_off_list', 'list', 'Off days - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'offDate', 'label', 'Date', 'displayField', TRUE),
          JSON_OBJECT('field', 'description', 'label', 'Description')
        ),
        'defaultSort', JSON_OBJECT('field', 'offDate', 'direction', 'desc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_off, 'tenant_off_form', 'form', 'Off day - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_off_fields'))),

  (@obj_sub, 'tenant_sub_list', 'list', 'Subscriptions - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'plan', 'label', 'Plan', 'displayField', TRUE),
          JSON_OBJECT('field', 'startDate', 'label', 'Start'),
          JSON_OBJECT('field', 'endDate', 'label', 'End'),
          JSON_OBJECT('field', 'isActive', 'label', 'Active')
        ),
        'defaultSort', JSON_OBJECT('field', 'startDate', 'direction', 'desc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_sub, 'tenant_sub_form', 'form', 'Subscription - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_sub_fields'))),

  (@obj_meta, 'tenant_meta_list', 'list', 'Prefs / notifications / security - List', NULL, NULL, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'metaKey', 'label', 'Key', 'displayField', TRUE),
          JSON_OBJECT('field', 'metaValue', 'label', 'Value')
        ),
        'defaultSort', JSON_OBJECT('field', 'metaKey', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50))
      )
    )),
  (@obj_meta, 'tenant_meta_form', 'form', 'Meta - Form', NULL, NULL, 0,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('tenant_meta_fields')))
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`),
  `config_json` = VALUES(`config_json`);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
) VALUES
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_org', 'Organisation', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Organisation',
        'fields', JSON_ARRAY('name', 'tenantIdentifier', 'tenantTypeId', 'statusId'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_form' LIMIT 1),
    'tenant_org', 'Organisation', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Organisation',
        'fields', JSON_ARRAY('name', 'tenantIdentifier', 'tenantTypeId', 'statusId'))))), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_contact', 'Organisation contact', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('email', 'phone', 'city', 'country'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_contact_info',
        'targetEntityKey', 'tenant_contact_info',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Contact',
          'fields', JSON_ARRAY('email', 'phone', 'address', 'city', 'state', 'country', 'postalCode')))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_billing', 'Billing', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section',
      'layout', JSON_OBJECT(
        'dataBinding', 'relation',
        'relationKey', 'tenant_billing_info',
        'targetEntityKey', 'tenant_billing_info',
        'relationPanelMode', 'embedded_form',
        'sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Billing',
          'fields', JSON_ARRAY('billingEmail', 'billingPhone', 'billingAddress', 'billingCity', 'billingState', 'billingCountry', 'billingPostalCode', 'billingCurrency', 'taxId', 'paymentTerms'))))), 3),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_config', 'Configuration', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('timezone', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'defaultTaskStatus'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_configuration',
        'targetEntityKey', 'tenant_configuration',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Configuration',
          'fields', JSON_ARRAY('timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'defaultTaskStatus', 'notificationPreferences', 'brandingLogo', 'twoFactorAuthEnabled'),
          'fieldConfigByKey', JSON_OBJECT(
            'timezone', JSON_OBJECT('inputType', 'timezone'),
            'weekStartDay', JSON_OBJECT('inputType', 'select', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'dateFormat', JSON_OBJECT('inputType', 'dateformat'),
            'timeFormat', JSON_OBJECT('inputType', 'timeformat'),
            'notificationPreferences', JSON_OBJECT('inputType', 'multiselect', 'optionsText', 'email,sms,push,in_app,none'),
            'twoFactorAuthEnabled', JSON_OBJECT('inputType', 'checkbox'))))))), 4),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_hours', 'Working hours', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('dayOfWeek', 'startTime', 'endTime'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_working_hour',
        'targetEntityKey', 'tenant_working_hour',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Working hours',
          'fields', JSON_ARRAY('dayOfWeek', 'startTime', 'endTime'),
          'fieldConfigByKey', JSON_OBJECT(
            'dayOfWeek', JSON_OBJECT('inputType', 'select', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'startTime', JSON_OBJECT('inputType', 'time'),
            'endTime', JSON_OBJECT('inputType', 'time'))))))), 5),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_off', 'Off days', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('offDate', 'description'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_off_day',
        'targetEntityKey', 'tenant_off_day',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Off day',
          'fields', JSON_ARRAY('offDate', 'description'),
          'fieldConfigByKey', JSON_OBJECT(
            'offDate', JSON_OBJECT('inputType', 'date'))))))), 6),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_sub', 'Subscription', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('plan', 'startDate', 'endDate', 'isActive'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_subscription',
        'targetEntityKey', 'tenant_subscription',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Subscription',
          'fields', JSON_ARRAY('plan', 'startDate', 'endDate', 'isActive'),
          'fieldConfigByKey', JSON_OBJECT(
            'plan', JSON_OBJECT('inputType', 'select', 'optionsText', 'free,basic,standard,premium,enterprise'),
            'startDate', JSON_OBJECT('inputType', 'date'),
            'endDate', JSON_OBJECT('inputType', 'date'),
            'isActive', JSON_OBJECT('inputType', 'checkbox'))))))), 7),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_tenant AND `view_key` = 'tenant_settings_detail' LIMIT 1),
    'tenant_meta', 'Preferences / notifications / security', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('metaKey', 'metaValue'),
        'dataBinding', 'relation',
        'relationKey', 'tenant_meta',
        'targetEntityKey', 'tenant_meta',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Meta',
          'fields', JSON_ARRAY('metaKey', 'metaValue')))))), 8),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_contact AND `view_key` = 'tenant_contact_form' LIMIT 1),
    'tenant_contact_fields', 'Contact', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'fields', JSON_ARRAY('email', 'phone', 'address', 'city', 'state', 'country', 'postalCode'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_billing AND `view_key` = 'tenant_billing_form' LIMIT 1),
    'tenant_billing_fields', 'Billing', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'fields', JSON_ARRAY('billingEmail', 'billingPhone', 'billingAddress', 'billingCity', 'billingState', 'billingCountry', 'billingPostalCode', 'billingCurrency', 'taxId', 'paymentTerms'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_config AND `view_key` = 'tenant_config_form' LIMIT 1),
    'tenant_config_fields', 'Configuration', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'sections', JSON_ARRAY(JSON_OBJECT(
          'fields', JSON_ARRAY('timezone', 'languageId', 'defaultCurrency', 'weekStartDay', 'dateFormat', 'timeFormat', 'defaultTaskStatus', 'notificationPreferences', 'brandingLogo', 'twoFactorAuthEnabled'),
          'fieldConfigByKey', JSON_OBJECT(
            'timezone', JSON_OBJECT('inputType', 'timezone'),
            'languageId', JSON_OBJECT('inputType', 'select'),
            'weekStartDay', JSON_OBJECT('inputType', 'select', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'dateFormat', JSON_OBJECT('inputType', 'dateformat'),
            'timeFormat', JSON_OBJECT('inputType', 'timeformat'),
            'notificationPreferences', JSON_OBJECT('inputType', 'multiselect', 'optionsText', 'email,sms,push,in_app,none'),
            'twoFactorAuthEnabled', JSON_OBJECT('inputType', 'checkbox'),
            'brandingLogo', JSON_OBJECT('inputType', 'file')
          ))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_hours AND `view_key` = 'tenant_hours_form' LIMIT 1),
    'tenant_hours_fields', 'Working hours', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'sections', JSON_ARRAY(JSON_OBJECT(
          'fields', JSON_ARRAY('dayOfWeek', 'startTime', 'endTime'),
          'fieldConfigByKey', JSON_OBJECT(
            'dayOfWeek', JSON_OBJECT('inputType', 'select', 'optionsText', 'monday,tuesday,wednesday,thursday,friday,saturday,sunday'),
            'startTime', JSON_OBJECT('inputType', 'time'),
            'endTime', JSON_OBJECT('inputType', 'time')
          ))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_off AND `view_key` = 'tenant_off_form' LIMIT 1),
    'tenant_off_fields', 'Off day', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'sections', JSON_ARRAY(JSON_OBJECT(
          'fields', JSON_ARRAY('offDate', 'description'),
          'fieldConfigByKey', JSON_OBJECT(
            'offDate', JSON_OBJECT('inputType', 'date'),
            'description', JSON_OBJECT('inputType', 'textarea')
          ))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_sub AND `view_key` = 'tenant_sub_form' LIMIT 1),
    'tenant_sub_fields', 'Subscription', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT(
        'sections', JSON_ARRAY(JSON_OBJECT(
          'fields', JSON_ARRAY('plan', 'startDate', 'endDate', 'isActive'),
          'fieldConfigByKey', JSON_OBJECT(
            'plan', JSON_OBJECT('inputType', 'select', 'optionsText', 'free,basic,standard,premium,enterprise'),
            'startDate', JSON_OBJECT('inputType', 'date'),
            'endDate', JSON_OBJECT('inputType', 'date'),
            'isActive', JSON_OBJECT('inputType', 'checkbox')
          ))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @obj_meta AND `view_key` = 'tenant_meta_form' LIMIT 1),
    'tenant_meta_fields', 'Meta', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'fields', JSON_ARRAY('metaKey', 'metaValue'))))), 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

-- Runtime overlays for system_table lookups (Designer V2 cannot put these on config_object_fields).
INSERT INTO `config_object_runtime_field_metadata` (
  `config_object_id`, `field_key`, `validation_json`, `rules_json`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
  (@obj_config, 'languageId',
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
  (@obj_tenant, 'tenantTypeId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_type',
        'valueKey', 'tenantTypeId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@obj_tenant, 'statusId',
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
  (@obj_tenant, 'userId',
    JSON_OBJECT(
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, @creator_tu, @creator_tu, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `validation_json` = VALUES(`validation_json`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET FOREIGN_KEY_CHECKS = 1;
