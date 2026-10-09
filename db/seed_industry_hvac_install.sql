--
-- Global HVAC installation demo template set (tenant_id NULL, PUBLISHED).
-- Seeds config objects, fields, verification, lifecycles, relationships, views.
-- Manifests are compiled at runtime - this file does not write gateway manifests.
--
-- Prerequisites: migrations applied; at least one tenant_users row.
-- Apply: mysql … < db/seed_industry_hvac_install.sql
--

SET FOREIGN_KEY_CHECKS = 0;

SET @creator_tu := (
  SELECT `tenant_user_id` FROM `tenant_users` ORDER BY `tenant_user_id` ASC LIMIT 1
);

INSERT INTO `config_template_sets` (
  `tenant_id`,
  `key`,
  `name`,
  `description`,
  `status`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES (
  NULL,
  'industry_hvac_install',
  'Demo - HVAC installation',
  'Air-conditioning install company: customers, install jobs, site surveys, checklists. Super-admin / client demos.',
  'PUBLISHED',
  @creator_tu,
  @creator_tu,
  NOW(6),
  NOW(6)
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET @hvac_tid := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'industry_hvac_install' LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`,
  `object_type`,
  `binding_mode`,
  `sor_table_name`,
  `display_name`,
  `description`,
  `status`,
  `created_at`,
  `updated_at`
) VALUES
  (@hvac_tid, 'customer', 'sor_bound', 'customers', 'Customer', 'HVAC account / homeowner', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'customer_contact', 'sor_bound', 'customer_contact_info', 'Site contact', 'Site or owner contact', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'project', 'sor_bound', 'projects', 'Install job', 'Air-conditioning install job', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'task', 'sor_bound', 'tasks', 'Install task', 'Work order on an install job', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'resource', 'sor_bound', 'resources', 'Technician / equipment', 'Crew member or equipment', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'scheduled_task', 'sor_bound', 'scheduled_tasks', 'Scheduled visit', 'Install or survey visit window', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'hvac_site_survey', 'standalone', NULL, 'Site survey', 'Load calc and site notes form', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'hvac_install_checklist', 'standalone', NULL, 'Install checklist', 'Commissioning checklist', 'PUBLISHED', NOW(6), NOW(6)),
  (@hvac_tid, 'hvac_tenant_registration', 'standalone', NULL, 'Company registration', 'Tenant registration form for onboarding step 1', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @hvac_customer_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'customer' LIMIT 1);
SET @hvac_contact_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'customer_contact' LIMIT 1);
SET @hvac_project_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'project' LIMIT 1);
SET @hvac_task_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'task' LIMIT 1);
SET @hvac_resource_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'resource' LIMIT 1);
SET @hvac_visit_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'scheduled_task' LIMIT 1);
SET @hvac_survey_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'hvac_site_survey' LIMIT 1);
SET @hvac_checklist_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'hvac_install_checklist' LIMIT 1);
SET @hvac_reg_id := (SELECT `config_object_id` FROM `config_objects` WHERE `config_template_set_id` = @hvac_tid AND `object_type` = 'hvac_tenant_registration' LIMIT 1);

UPDATE `config_objects`
SET `verification_field_map` = JSON_OBJECT(
  'tokenField', 'verification_token',
  'expiresAtField', 'token_expires_at',
  'verifiedField', 'email_verified',
  'defaultTtlHours', 24
)
WHERE `config_object_id` = @hvac_customer_id;

INSERT INTO `config_object_fields` (
  `config_object_id`, `field_key`, `label`, `description`, `field_type`,
  `validation_json`, `default_value`, `is_required`, `is_system`, `order_index`,
  `section_key`, `created_by`, `updated_by`, `created_at`, `updated_at`
) VALUES
  (@hvac_customer_id, 'billing_entity', 'Billing entity', 'Legal name for invoicing', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 200), JSON_QUOTE(''), 0, 0, 10, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_customer_id, 'service_agreement_tier', 'Service agreement', 'Maintenance plan tier', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('none', 'basic', 'plus', 'premium')),
    JSON_QUOTE('none'), 0, 0, 20, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_customer_id, 'verification_token', 'Verification token', 'Email verification token', 'text',
    JSON_OBJECT('type', 'string'), JSON_QUOTE(''), 0, 1, 90, '__verification', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_customer_id, 'token_expires_at', 'Token expires at', 'Verification token expiry', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date-time'), JSON_QUOTE(''), 0, 1, 91, '__verification', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_customer_id, 'email_verified', 'Email verified', 'Customer email verified', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 0, 1, 92, '__verification', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_contact_id, 'site_role', 'Site role', 'Role on site', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('owner', 'site_super', 'facility_manager', 'other')),
    JSON_QUOTE('owner'), 0, 0, 10, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_contact_id, 'emergency_phone', 'Emergency phone', '24h contact', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 32), JSON_QUOTE(''), 0, 0, 20, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_project_id, 'job_number', 'Job number', 'External job number', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 80, 'pattern', '^[A-Z0-9._/-]*$'), JSON_QUOTE(''), 1, 0, 10, 'job', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'site_address', 'Site address', 'Install address', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 500), JSON_QUOTE(''), 1, 0, 20, 'job', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'equipment_type', 'Equipment type', 'System being installed', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('split_ac', 'heat_pump', 'furnace', 'package_unit', 'mini_split')),
    JSON_QUOTE('split_ac'), 0, 0, 30, 'equipment', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'tonnage', 'Tonnage', 'System capacity (tons)', 'number',
    JSON_OBJECT('type', 'number', 'minimum', 0, 'maximum', 20), JSON_EXTRACT('0', '$'), 0, 0, 40, 'equipment', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'permit_id', 'Permit ID', 'Building permit', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 120), JSON_QUOTE(''), 0, 0, 50, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'warranty_start', 'Warranty start', 'Warranty start date', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date'), JSON_QUOTE(''), 0, 0, 60, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_task_id, 'work_order_id', 'Work order ID', 'External WO reference', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 64), JSON_QUOTE(''), 0, 0, 10, 'operations', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'install_phase', 'Install phase', 'Work phase', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('rough_in', 'set', 'startup', 'commission')),
    JSON_QUOTE('set'), 0, 0, 20, 'operations', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'refrigerant_charge', 'Refrigerant charge', 'Charge notes', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 200), JSON_QUOTE(''), 0, 0, 30, 'operations', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'ppe_required', 'PPE required', 'PPE required on site', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(TRUE AS JSON), 0, 0, 40, 'safety', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_resource_id, 'license_expiry', 'License expiry', 'Trade license expiry', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date'), JSON_QUOTE('2099-12-31'), 0, 0, 10, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_resource_id, 'epa_cert_expiry', 'EPA cert expiry', 'EPA 608 certification', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date'), JSON_QUOTE('2099-12-31'), 0, 0, 20, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_resource_id, 'epa_cert_number', 'EPA cert number', 'Certification number', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 64), JSON_QUOTE(''), 0, 0, 30, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_visit_id, 'visit_window', 'Visit window', 'Preferred window label', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('am', 'pm', 'all_day')),
    JSON_QUOTE('am'), 0, 0, 10, 'scheduling', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_visit_id, 'dispatch_priority', 'Dispatch priority', 'Crew dispatch priority', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('normal', 'high', 'emergency')),
    JSON_QUOTE('normal'), 0, 0, 20, 'scheduling', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_survey_id, 'sq_ft', 'Square footage', 'Conditioned area', 'number',
    JSON_OBJECT('type', 'integer', 'minimum', 0), JSON_EXTRACT('0', '$'), 1, 0, 10, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_survey_id, 'existing_system_type', 'Existing system', 'Current equipment', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('none', 'split_ac', 'heat_pump', 'furnace', 'window', 'unknown')),
    JSON_QUOTE('unknown'), 0, 0, 20, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_survey_id, 'duct_condition', 'Duct condition', 'Ductwork condition', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('good', 'fair', 'replace', 'none')),
    JSON_QUOTE('fair'), 0, 0, 30, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_survey_id, 'electrical_panel_amps', 'Panel amps', 'Electrical panel capacity', 'number',
    JSON_OBJECT('type', 'integer', 'minimum', 0), JSON_EXTRACT('100', '$'), 0, 0, 40, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_survey_id, 'recommended_tonnage', 'Recommended tons', 'Load-calc recommendation', 'number',
    JSON_OBJECT('type', 'number', 'minimum', 0), JSON_EXTRACT('0', '$'), 0, 0, 50, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_survey_id, 'survey_notes', 'Survey notes', 'Free-text notes', 'textarea',
    JSON_OBJECT('type', 'string', 'maxLength', 4000), JSON_QUOTE(''), 0, 0, 60, 'site', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_checklist_id, 'refrigerant_leak_test', 'Leak test passed', 'Refrigerant leak test', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 1, 0, 10, 'commission', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_checklist_id, 'static_pressure_ok', 'Static pressure OK', 'Duct static pressure in range', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 1, 0, 20, 'commission', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_checklist_id, 'thermostat_commissioned', 'Thermostat commissioned', 'Thermostat programmed', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 1, 0, 30, 'commission', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_checklist_id, 'customer_walkthrough_done', 'Customer walkthrough', 'Owner walkthrough complete', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 1, 0, 40, 'commission', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_checklist_id, 'photos_attached', 'Photos attached', 'Install photos on file', 'boolean',
    JSON_OBJECT('type', 'boolean'), CAST(FALSE AS JSON), 0, 0, 50, 'commission', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@hvac_reg_id, 'company_name', 'Company name', 'Legal company name', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 1, 'maxLength', 255), JSON_QUOTE(''), 1, 0, 10, 'company', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'tenant_identifier', 'Tenant identifier', 'Unique slug', 'text',
    JSON_OBJECT('type', 'string', 'maxLength', 255), JSON_QUOTE(''), 0, 0, 20, 'company', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'tenant_type_id', 'Tenant type', 'Lookup tenant types', 'number',
    JSON_OBJECT(
      'type', 'integer',
      'minimum', 1,
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_type',
        'valueKey', 'tenantTypeId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    JSON_EXTRACT('1', '$'), 0, 0, 30, 'company', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_email', 'Admin email', 'Owner email', 'text',
    JSON_OBJECT('type', 'string', 'format', 'email'), JSON_QUOTE(''), 1, 0, 40, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_username', 'Admin username', 'Login username', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 3), JSON_QUOTE(''), 1, 0, 50, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_first_name', 'Admin first name', 'Owner first name', 'text',
    JSON_OBJECT('type', 'string'), JSON_QUOTE(''), 1, 0, 60, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_last_name', 'Admin last name', 'Owner last name', 'text',
    JSON_OBJECT('type', 'string'), JSON_QUOTE(''), 1, 0, 70, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_display_name', 'Admin display name', 'Derived admin label', 'text',
    JSON_OBJECT(
      'type', 'string',
      '_six1DerivedRuntimeAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'operation', 'concat',
        'sourceFieldKeys', JSON_ARRAY('admin_first_name', 'admin_last_name'),
        'separator', ' ',
        'displayOnly', TRUE
      )
    ),
    JSON_QUOTE(''), 0, 0, 75, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_reg_id, 'admin_password', 'Admin password', 'Initial password', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 8, 'format', 'password'), JSON_QUOTE(''), 1, 0, 80, 'admin', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  -- SoR FK overlays (same pattern as Object Designer runtime lookup authoring on role / notification_template)
  (@hvac_project_id, 'tenantId', 'Tenant', 'Owning tenant', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant',
        'valueKey', 'tenantId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 0, 1, 200, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_project_id, 'processInstanceId', 'Process instance', 'Linked process instance', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:process_instance',
        'valueKey', 'processInstanceId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 0, 1, 210, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'projectId', 'Install job', 'Parent install job', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:project',
        'valueKey', 'projectId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 1, 1, 200, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'taskStatusId', 'Task status', 'Install task status', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:project_task_status',
        'valueKey', 'projectTaskStatusId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 1, 1, 210, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'primaryAssigneeId', 'Primary assignee', 'Default assignee', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:user',
        'valueKey', 'userId',
        'labelKey', 'displayName',
        'searchable', TRUE
      )
    ),
    NULL, 0, 1, 220, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_task_id, 'teamId', 'Team', 'Owning team', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:tenant_team',
        'valueKey', 'tenantTeamId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 0, 1, 230, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_contact_id, 'customerId', 'Customer', 'Parent customer account', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:customer',
        'valueKey', 'customerId',
        'labelKey', 'email',
        'searchable', TRUE
      )
    ),
    NULL, 1, 1, 200, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_contact_id, 'languageId', 'Language', 'Preferred language', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'core.system_language.list',
        'valueKey', 'languageId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 0, 1, 210, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@hvac_visit_id, 'taskId', 'Task', 'Linked work order', 'number',
    JSON_OBJECT(
      'type', 'integer',
      '_six1LookupSelectAuthoring', JSON_OBJECT(
        'schemaVersion', 1,
        'dataRef', 'entity-key:task',
        'valueKey', 'taskId',
        'labelKey', 'name',
        'searchable', TRUE
      )
    ),
    NULL, 1, 1, 200, '__lookups', @creator_tu, @creator_tu, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `field_type` = VALUES(`field_type`),
  `validation_json` = VALUES(`validation_json`),
  `default_value` = VALUES(`default_value`),
  `is_required` = VALUES(`is_required`),
  `is_system` = VALUES(`is_system`),
  `order_index` = VALUES(`order_index`),
  `section_key` = VALUES(`section_key`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `config_object_verification_rules` (
  `config_object_id`, `trigger_key`, `when_json`, `then_json`, `is_active`
)
SELECT
  @hvac_customer_id,
  'verify_email',
  JSON_OBJECT(
    'and', JSON_ARRAY(
      JSON_OBJECT('==', JSON_ARRAY(JSON_OBJECT('var', 'record.verification_token'), JSON_OBJECT('var', 'input.token'))),
      JSON_OBJECT('>', JSON_ARRAY(JSON_OBJECT('var', 'record.token_expires_at'), JSON_OBJECT('var', 'now'))),
      JSON_OBJECT('!', JSON_ARRAY(JSON_OBJECT('var', 'record.email_verified')))
    )
  ),
  JSON_OBJECT(
    'set', JSON_OBJECT('email_verified', TRUE, 'verification_token', NULL, 'token_expires_at', NULL),
    'emit', 'six1-event.sor_bound_instance.updated'
  ),
  1
WHERE NOT EXISTS (
  SELECT 1 FROM `config_object_verification_rules`
  WHERE `config_object_id` = @hvac_customer_id AND `trigger_key` = 'verify_email'
);

INSERT INTO `config_object_lifecycles` (
  `config_object_id`, `state_key`, `label`, `description`, `order_index`
) VALUES
  (@hvac_project_id, 'estimate', 'Estimate', 'Quote / estimate', 1),
  (@hvac_project_id, 'scheduled', 'Scheduled', 'Install scheduled', 2),
  (@hvac_project_id, 'in_progress', 'In progress', 'Work ongoing', 3),
  (@hvac_project_id, 'commissioning', 'Commissioning', 'Startup and QA', 4),
  (@hvac_project_id, 'closed', 'Closed', 'Job closed', 5),
  (@hvac_project_id, 'canceled', 'Canceled', 'Canceled', 6),
  (@hvac_task_id, 'dispatched', 'Dispatched', 'Crew assigned', 1),
  (@hvac_task_id, 'on_site', 'On site', 'Work in progress', 2),
  (@hvac_task_id, 'awaiting_inspection', 'Awaiting inspection', 'QA / inspection', 3),
  (@hvac_task_id, 'completed', 'Completed', 'Done', 4),
  (@hvac_task_id, 'canceled', 'Canceled', 'Canceled', 5)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `order_index` = VALUES(`order_index`);

INSERT INTO `config_object_lifecycle_transitions` (
  `config_object_id`, `from_state_key`, `to_state_key`, `rules_json`
) VALUES
  (@hvac_project_id, 'estimate', 'scheduled', NULL),
  (@hvac_project_id, 'scheduled', 'in_progress', NULL),
  (@hvac_project_id, 'in_progress', 'commissioning', NULL),
  (@hvac_project_id, 'commissioning', 'closed', NULL),
  (@hvac_project_id, 'estimate', 'canceled', NULL),
  (@hvac_project_id, 'scheduled', 'canceled', NULL),
  (@hvac_task_id, 'dispatched', 'on_site', NULL),
  (@hvac_task_id, 'on_site', 'awaiting_inspection', NULL),
  (@hvac_task_id, 'awaiting_inspection', 'completed', NULL),
  (@hvac_task_id, 'dispatched', 'canceled', NULL),
  (@hvac_task_id, 'on_site', 'canceled', NULL)
ON DUPLICATE KEY UPDATE
  `rules_json` = VALUES(`rules_json`);

INSERT INTO `config_object_relationships` (
  `from_object_type`, `to_object_type`, `relationship_key`, `display_name`,
  `cardinality`, `query_config`, `is_active`
) VALUES
  ('project', 'task', 'demo_hvac_project_tasks', 'HVAC - Job tasks', 'one_to_many',
    JSON_OBJECT('sor_table', 'tasks', 'foreign_key', 'project_id', 'local_key', 'project_id', 'demo_template_key', 'industry_hvac_install'), 1),
  ('project', 'customer', 'demo_hvac_project_customers', 'HVAC - Job customers', 'many_to_many',
    JSON_OBJECT('join_table', 'customer_project_members', 'join_local_key', 'project_id', 'join_foreign_key', 'customer_id', 'target_table', 'customers', 'target_primary_key', 'customer_id', 'demo_template_key', 'industry_hvac_install'), 1),
  ('project', 'customer_contact', 'demo_hvac_project_contacts', 'HVAC - Job site contacts', 'one_to_many',
    JSON_OBJECT('via', 'customer_project_members', 'join_local_key', 'project_id', 'target_table', 'customer_contact_info', 'target_foreign_key', 'customer_id', 'demo_template_key', 'industry_hvac_install'), 1),
  ('customer', 'project', 'demo_hvac_customer_projects', 'HVAC - Customer jobs', 'many_to_many',
    JSON_OBJECT('join_table', 'customer_project_members', 'join_local_key', 'customer_id', 'join_foreign_key', 'project_id', 'target_table', 'projects', 'target_primary_key', 'project_id', 'demo_template_key', 'industry_hvac_install'), 1),
  ('customer', 'customer_contact', 'demo_hvac_customer_contacts', 'HVAC - Customer contacts', 'one_to_many',
    JSON_OBJECT('sor_table', 'customer_contact_info', 'foreign_key', 'customer_id', 'local_key', 'customer_id', 'demo_template_key', 'industry_hvac_install'), 1)
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

-- ---------------------------------------------------------------------------
-- Views / panels (canonical Object1 layout_config; camelCase SoR + snake_case meta)
-- One default list/detail/form per object (role_key NULL). No role-scoped dupes.
-- List filters use gateway Filter DTO + optional ui envelope for Object Runner.
-- ---------------------------------------------------------------------------

DELETE p FROM `config_object_view_panels` p
INNER JOIN `config_object_views` v ON v.`config_object_view_id` = p.`config_object_view_id`
WHERE v.`config_object_id` IN (
  @hvac_customer_id, @hvac_contact_id, @hvac_project_id, @hvac_task_id,
  @hvac_resource_id, @hvac_visit_id, @hvac_survey_id, @hvac_checklist_id, @hvac_reg_id
);

DELETE FROM `config_object_views`
WHERE `config_object_id` IN (
  @hvac_customer_id, @hvac_contact_id, @hvac_project_id, @hvac_task_id,
  @hvac_resource_id, @hvac_visit_id, @hvac_survey_id, @hvac_checklist_id, @hvac_reg_id
);

INSERT INTO `config_object_views` (
  `config_object_id`, `view_key`, `view_type`, `name`, `description`,
  `role_key`, `is_default`, `is_active`, `config_json`
) VALUES
  -- Customer
  (@hvac_customer_id, 'demo_hvac_customer_list', 'list', 'HVAC Customers - List', 'Accounts / homeowners', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'email', 'label', 'Email'),
          JSON_OBJECT('field', 'firstName', 'label', 'First name'),
          JSON_OBJECT('field', 'lastName', 'label', 'Last name'),
          JSON_OBJECT('field', 'service_agreement_tier', 'label', 'Agreement')
        ),
        'defaultSort', JSON_OBJECT('field', 'email', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'email', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Email', 'section', 'Identity')),
          JSON_OBJECT('source', 'core', 'field', 'firstName', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'First name', 'section', 'Identity')),
          JSON_OBJECT('source', 'meta', 'field', 'service_agreement_tier', 'operator', 'in', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'multiSelect', 'label', 'Agreement tier', 'section', 'Commercial'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New customer'))
      )
    )),
  (@hvac_customer_id, 'demo_hvac_customer_detail', 'detail', 'HVAC Customer - Detail', 'Profile, commercial, contacts, jobs', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'hvac_cust_core', 'hvac_cust_commercial', 'hvac_cust_contacts', 'hvac_cust_jobs'))),
  (@hvac_customer_id, 'demo_hvac_customer_form', 'form', 'HVAC Customer - Form', 'Create / edit (writable fields only)', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_cust_core', 'hvac_cust_commercial'))),

  -- Site contact
  (@hvac_contact_id, 'demo_hvac_contact_list', 'list', 'HVAC Site contacts - List', 'Owner / site contacts', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'secondaryEmail', 'label', 'Email'),
          JSON_OBJECT('field', 'phone', 'label', 'Phone'),
          JSON_OBJECT('field', 'city', 'label', 'City'),
          JSON_OBJECT('field', 'site_role', 'label', 'Site role')
        ),
        'defaultSort', JSON_OBJECT('field', 'secondaryEmail', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'secondaryEmail', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Email', 'section', 'Contact')),
          JSON_OBJECT('source', 'core', 'field', 'city', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'City', 'section', 'Contact')),
          JSON_OBJECT('source', 'meta', 'field', 'site_role', 'operator', 'in', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'multiSelect', 'label', 'Site role', 'section', 'Profile'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New contact'))
      )
    )),
  (@hvac_contact_id, 'demo_hvac_contact_detail', 'detail', 'HVAC Site contact - Detail', 'Contact + site profile', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_contact_core', 'hvac_contact_profile'))),
  (@hvac_contact_id, 'demo_hvac_contact_form', 'form', 'HVAC Site contact - Form', 'Create / edit contact', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_contact_core', 'hvac_contact_profile'))),

  -- Install job (project)
  (@hvac_project_id, 'demo_hvac_job_list', 'list', 'HVAC Jobs - List', 'Install jobs (table + board)', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'board',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Job name'),
          JSON_OBJECT('field', 'projectIdentifier', 'label', 'Identifier'),
          JSON_OBJECT('field', 'job_number', 'label', 'Job number'),
          JSON_OBJECT('field', 'site_address', 'label', 'Site'),
          JSON_OBJECT('field', 'equipment_type', 'label', 'Equipment'),
          JSON_OBJECT('field', 'status', 'label', 'Status')
        ),
        'defaultSort', JSON_OBJECT('field', 'name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'name', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Job name', 'section', 'Job')),
          JSON_OBJECT('source', 'core', 'field', 'status', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'SoR status', 'section', 'Job')),
          JSON_OBJECT('source', 'meta', 'field', 'equipment_type', 'operator', 'in', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'multiSelect', 'label', 'Equipment', 'section', 'Equipment')),
          JSON_OBJECT('source', 'meta', 'field', 'job_number', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Job number', 'section', 'Job'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New job'))
      ),
      'board', JSON_OBJECT(
        'groupByField', 'lifecycle_state',
        'cardTitleField', 'name',
        'cardSubtitleFields', JSON_ARRAY('job_number', 'site_address'),
        'swimlaneOrder', JSON_ARRAY('estimate', 'scheduled', 'in_progress', 'commissioning', 'closed', 'canceled')
      )
    )),
  (@hvac_project_id, 'demo_hvac_job_detail', 'detail', 'HVAC Job - Detail', 'Site, equipment, tasks, customers', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'hvac_job_core', 'hvac_job_site', 'hvac_job_equipment', 'hvac_job_tasks', 'hvac_job_customers'))),
  (@hvac_project_id, 'demo_hvac_job_form', 'form', 'HVAC Job - Form', 'Create / edit install job', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY(
      'hvac_job_core', 'hvac_job_site', 'hvac_job_equipment'))),

  -- Install task
  (@hvac_task_id, 'demo_hvac_task_list', 'list', 'HVAC Work orders - List', 'Install tasks (table + board)', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'board',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Task'),
          JSON_OBJECT('field', 'taskIdentifier', 'label', 'Identifier'),
          JSON_OBJECT('field', 'priority', 'label', 'Priority'),
          JSON_OBJECT('field', 'work_order_id', 'label', 'Work order'),
          JSON_OBJECT('field', 'install_phase', 'label', 'Phase')
        ),
        'defaultSort', JSON_OBJECT('field', 'name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'name', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Task name', 'section', 'Task')),
          JSON_OBJECT('source', 'core', 'field', 'priority', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Priority', 'section', 'Task')),
          JSON_OBJECT('source', 'meta', 'field', 'install_phase', 'operator', 'in', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'multiSelect', 'label', 'Install phase', 'section', 'Operations'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New work order'))
      ),
      'board', JSON_OBJECT(
        'groupByField', 'lifecycle_state',
        'cardTitleField', 'name',
        'cardSubtitleFields', JSON_ARRAY('work_order_id', 'install_phase'),
        'swimlaneOrder', JSON_ARRAY('dispatched', 'on_site', 'awaiting_inspection', 'completed', 'canceled')
      )
    )),
  (@hvac_task_id, 'demo_hvac_task_detail', 'detail', 'HVAC Work order - Detail', 'Task core + operations', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_task_core', 'hvac_task_ops'))),
  (@hvac_task_id, 'demo_hvac_task_form', 'form', 'HVAC Work order - Form', 'Create / edit work order', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_task_core', 'hvac_task_ops'))),

  -- Resource
  (@hvac_resource_id, 'demo_hvac_resource_list', 'list', 'HVAC Resources - List', 'Techs and equipment', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'name', 'label', 'Name'),
          JSON_OBJECT('field', 'type', 'label', 'Type'),
          JSON_OBJECT('field', 'description', 'label', 'Description'),
          JSON_OBJECT('field', 'isShared', 'label', 'Shared'),
          JSON_OBJECT('field', 'epa_cert_number', 'label', 'EPA cert #')
        ),
        'defaultSort', JSON_OBJECT('field', 'name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'name', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Name', 'section', 'Resource')),
          JSON_OBJECT('source', 'core', 'field', 'type', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Type', 'section', 'Resource'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New resource'))
      )
    )),
  (@hvac_resource_id, 'demo_hvac_resource_detail', 'detail', 'HVAC Resource - Detail', 'Resource + compliance', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_resource_core', 'hvac_resource_compliance'))),
  (@hvac_resource_id, 'demo_hvac_resource_form', 'form', 'HVAC Resource - Form', 'Create / edit resource', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_resource_core', 'hvac_resource_compliance'))),

  -- Scheduled visit (SoR schedule columns; meta visit_window is authoring-only / non-persisting)
  (@hvac_visit_id, 'demo_hvac_visit_list', 'list', 'HVAC Visits - List', 'Scheduled visit windows', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'taskId', 'label', 'Task'),
          JSON_OBJECT('field', 'requestedStartUtc', 'label', 'Start (UTC)'),
          JSON_OBJECT('field', 'requestedEndUtc', 'label', 'End (UTC)'),
          JSON_OBJECT('field', 'priority', 'label', 'Priority')
        ),
        'defaultSort', JSON_OBJECT('field', 'requestedStartUtc', 'direction', 'desc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'core', 'field', 'taskId', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Task ID', 'section', 'Visit')),
          JSON_OBJECT('source', 'core', 'field', 'priority', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Priority', 'section', 'Visit')),
          JSON_OBJECT('source', 'core', 'field', 'requestedStartUtc', 'operator', 'gte', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Start from', 'section', 'Visit'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'Schedule visit'))
      )
    )),
  (@hvac_visit_id, 'demo_hvac_visit_detail', 'detail', 'HVAC Visit - Detail', 'Visit window', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_visit_core', 'hvac_visit_prefs'))),
  (@hvac_visit_id, 'demo_hvac_visit_form', 'form', 'HVAC Visit - Form', 'Create / reschedule visit', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_visit_core', 'hvac_visit_prefs'))),

  -- Site survey (standalone)
  (@hvac_survey_id, 'demo_hvac_survey_list', 'list', 'Site surveys - List', 'Load-calc surveys', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'sq_ft', 'label', 'Sq ft'),
          JSON_OBJECT('field', 'existing_system_type', 'label', 'Existing system'),
          JSON_OBJECT('field', 'recommended_tonnage', 'label', 'Rec. tons'),
          JSON_OBJECT('field', 'duct_condition', 'label', 'Ducts')
        ),
        'defaultSort', JSON_OBJECT('field', 'sq_ft', 'direction', 'desc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'meta', 'field', 'existing_system_type', 'operator', 'in', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'multiSelect', 'label', 'Existing system', 'section', 'Site')),
          JSON_OBJECT('source', 'meta', 'field', 'duct_condition', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Duct condition', 'section', 'Site'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New survey'))
      )
    )),
  (@hvac_survey_id, 'demo_hvac_survey_form', 'form', 'Site survey - Form', 'Process step form', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_survey_site'))),
  (@hvac_survey_id, 'demo_hvac_survey_detail', 'detail', 'Site survey - Detail', 'Survey results', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_survey_site'))),

  -- Install checklist (standalone)
  (@hvac_checklist_id, 'demo_hvac_checklist_list', 'list', 'Install checklists - List', 'Commissioning checklists', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'refrigerant_leak_test', 'label', 'Leak test'),
          JSON_OBJECT('field', 'static_pressure_ok', 'label', 'Static pressure'),
          JSON_OBJECT('field', 'thermostat_commissioned', 'label', 'Thermostat'),
          JSON_OBJECT('field', 'customer_walkthrough_done', 'label', 'Walkthrough'),
          JSON_OBJECT('field', 'photos_attached', 'label', 'Photos')
        ),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'meta', 'field', 'refrigerant_leak_test', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Leak test passed', 'section', 'Commission')),
          JSON_OBJECT('source', 'meta', 'field', 'customer_walkthrough_done', 'operator', 'eq', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'dropdown', 'label', 'Walkthrough done', 'section', 'Commission'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New checklist'))
      )
    )),
  (@hvac_checklist_id, 'demo_hvac_checklist_form', 'form', 'Install checklist - Form', 'Process step form', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_checklist_commission'))),
  (@hvac_checklist_id, 'demo_hvac_checklist_detail', 'detail', 'Install checklist - Detail', 'Commissioning results', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_checklist_commission'))),

  -- Company registration (standalone)
  (@hvac_reg_id, 'demo_hvac_reg_list', 'list', 'Company registrations - List', 'Tenant onboarding payloads', NULL, 1, 1,
    JSON_OBJECT(
      'schemaVersion', 1,
      'defaultPresentation', 'table',
      'table', JSON_OBJECT(
        'columns', JSON_ARRAY(
          JSON_OBJECT('field', 'company_name', 'label', 'Company'),
          JSON_OBJECT('field', 'tenant_identifier', 'label', 'Identifier'),
          JSON_OBJECT('field', 'admin_email', 'label', 'Admin email'),
          JSON_OBJECT('field', 'admin_username', 'label', 'Admin user')
        ),
        'defaultSort', JSON_OBJECT('field', 'company_name', 'direction', 'asc'),
        'pagination', JSON_OBJECT('defaultLimit', 20, 'limitOptions', JSON_ARRAY(10, 20, 50)),
        'filters', JSON_ARRAY(
          JSON_OBJECT('source', 'meta', 'field', 'company_name', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Company', 'section', 'Company')),
          JSON_OBJECT('source', 'meta', 'field', 'admin_email', 'operator', 'contains', 'value', '',
            'ui', JSON_OBJECT('displayKind', 'text', 'label', 'Admin email', 'section', 'Admin'))
        ),
        'actions', JSON_ARRAY(JSON_OBJECT('bindingKey', 'create', 'label', 'New registration'))
      )
    )),
  (@hvac_reg_id, 'demo_hvac_reg_form', 'form', 'Company registration - Form', 'Tenant onboarding step 1', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_reg_company', 'hvac_reg_admin'))),
  (@hvac_reg_id, 'demo_hvac_reg_detail', 'detail', 'Company registration - Detail', 'Registration payload', NULL, 0, 1,
    JSON_OBJECT('schemaVersion', 1, 'panels', JSON_ARRAY('hvac_reg_company', 'hvac_reg_admin_ro')));

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`, `panel_key`, `title`, `panel_type`, `layout_config`, `order_index`
) VALUES
  -- Customer detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_detail' LIMIT 1),
    'hvac_cust_core', 'Customer', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Identity',
        'fields', JSON_ARRAY('email', 'firstName', 'lastName', 'isProfileCompleted'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_detail' LIMIT 1),
    'hvac_cust_commercial', 'Commercial', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Commercial',
        'fields', JSON_ARRAY('billing_entity', 'service_agreement_tier'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_detail' LIMIT 1),
    'hvac_cust_contacts', 'Site contacts', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('secondaryEmail', 'phone', 'city', 'site_role'),
        'dataBinding', 'relation',
        'relationKey', 'demo_hvac_customer_contacts',
        'targetEntityKey', 'customer_contact',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Contact',
          'fields', JSON_ARRAY('secondaryEmail', 'phone', 'address', 'city', 'state', 'country', 'postalCode', 'site_role', 'emergency_phone')))))), 3),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_detail' LIMIT 1),
    'hvac_cust_jobs', 'Install jobs', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'job_number', 'site_address', 'status'),
        'dataBinding', 'relation',
        'relationKey', 'demo_hvac_customer_projects',
        'targetEntityKey', 'project',
        'relationPanelMode', 'related_list')), 4),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_form' LIMIT 1),
    'hvac_cust_core', 'Customer', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Identity',
        'fields', JSON_ARRAY('email', 'firstName', 'lastName', 'password', 'isProfileCompleted'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_customer_id AND `view_key` = 'demo_hvac_customer_form' LIMIT 1),
    'hvac_cust_commercial', 'Commercial', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Commercial',
        'fields', JSON_ARRAY('billing_entity', 'service_agreement_tier'))))), 2),

  -- Contact detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_contact_id AND `view_key` = 'demo_hvac_contact_detail' LIMIT 1),
    'hvac_contact_core', 'Contact', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Contact',
        'fields', JSON_ARRAY('secondaryEmail', 'phone', 'address', 'city', 'state', 'country', 'postalCode'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_contact_id AND `view_key` = 'demo_hvac_contact_detail' LIMIT 1),
    'hvac_contact_profile', 'Site profile', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Site profile',
        'fields', JSON_ARRAY('site_role', 'emergency_phone'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_contact_id AND `view_key` = 'demo_hvac_contact_form' LIMIT 1),
    'hvac_contact_core', 'Contact', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Contact',
        'fields', JSON_ARRAY('secondaryEmail', 'phone', 'address', 'city', 'state', 'country', 'postalCode'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_contact_id AND `view_key` = 'demo_hvac_contact_form' LIMIT 1),
    'hvac_contact_profile', 'Site profile', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Site profile',
        'fields', JSON_ARRAY('site_role', 'emergency_phone'))))), 2),

  -- Job detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_detail' LIMIT 1),
    'hvac_job_core', 'Job', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Job',
        'fields', JSON_ARRAY('name', 'description', 'projectIdentifier', 'status', 'isShared'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_detail' LIMIT 1),
    'hvac_job_site', 'Job site', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Job site',
        'fields', JSON_ARRAY('job_number', 'site_address'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_detail' LIMIT 1),
    'hvac_job_equipment', 'Equipment & compliance', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Equipment',
        'fields', JSON_ARRAY('equipment_type', 'tonnage', 'permit_id', 'warranty_start'))))), 3),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_detail' LIMIT 1),
    'hvac_job_tasks', 'Work orders', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('name', 'work_order_id', 'install_phase', 'priority'),
        'dataBinding', 'relation',
        'relationKey', 'demo_hvac_project_tasks',
        'targetEntityKey', 'task',
        'relationPanelMode', 'related_list',
        'form', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
          'title', 'Work order',
          'fields', JSON_ARRAY('name', 'description', 'priority', 'work_order_id', 'install_phase', 'refrigerant_charge', 'ppe_required')))))), 4),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_detail' LIMIT 1),
    'hvac_job_customers', 'Customers', 'table',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'table', 'dataBinding', 'relation',
      'layout', JSON_OBJECT(
        'columns', JSON_ARRAY('email', 'firstName', 'lastName'),
        'dataBinding', 'relation',
        'relationKey', 'demo_hvac_project_customers',
        'targetEntityKey', 'customer',
        'relationPanelMode', 'related_list')), 5),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_form' LIMIT 1),
    'hvac_job_core', 'Job', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Job',
        'fields', JSON_ARRAY('name', 'description', 'projectIdentifier', 'isShared'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_form' LIMIT 1),
    'hvac_job_site', 'Job site', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Job site',
        'fields', JSON_ARRAY('job_number', 'site_address'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_project_id AND `view_key` = 'demo_hvac_job_form' LIMIT 1),
    'hvac_job_equipment', 'Equipment & compliance', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Equipment',
        'fields', JSON_ARRAY('equipment_type', 'tonnage', 'permit_id', 'warranty_start'))))), 3),

  -- Task detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_task_id AND `view_key` = 'demo_hvac_task_detail' LIMIT 1),
    'hvac_task_core', 'Work order', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Work order',
        'fields', JSON_ARRAY('name', 'description', 'taskIdentifier', 'priority', 'estimatedDuration', 'effortHours'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_task_id AND `view_key` = 'demo_hvac_task_detail' LIMIT 1),
    'hvac_task_ops', 'Operations', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Operations',
        'fields', JSON_ARRAY('work_order_id', 'install_phase', 'refrigerant_charge', 'ppe_required'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_task_id AND `view_key` = 'demo_hvac_task_form' LIMIT 1),
    'hvac_task_core', 'Work order', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Work order',
        'fields', JSON_ARRAY('name', 'description', 'taskIdentifier', 'priority', 'estimatedDuration', 'effortHours'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_task_id AND `view_key` = 'demo_hvac_task_form' LIMIT 1),
    'hvac_task_ops', 'Operations', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Operations',
        'fields', JSON_ARRAY('work_order_id', 'install_phase', 'refrigerant_charge', 'ppe_required'))))), 2),

  -- Resource detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_resource_id AND `view_key` = 'demo_hvac_resource_detail' LIMIT 1),
    'hvac_resource_core', 'Resource', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Resource',
        'fields', JSON_ARRAY('name', 'type', 'description', 'tenantUserId', 'isShared'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_resource_id AND `view_key` = 'demo_hvac_resource_detail' LIMIT 1),
    'hvac_resource_compliance', 'Compliance', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Compliance',
        'fields', JSON_ARRAY('license_expiry', 'epa_cert_expiry', 'epa_cert_number'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_resource_id AND `view_key` = 'demo_hvac_resource_form' LIMIT 1),
    'hvac_resource_core', 'Resource', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Resource',
        'fields', JSON_ARRAY('name', 'type', 'description', 'tenantUserId', 'isShared'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_resource_id AND `view_key` = 'demo_hvac_resource_form' LIMIT 1),
    'hvac_resource_compliance', 'Compliance', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Compliance',
        'fields', JSON_ARRAY('license_expiry', 'epa_cert_expiry', 'epa_cert_number'))))), 2),

  -- Visit detail / form
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_visit_id AND `view_key` = 'demo_hvac_visit_detail' LIMIT 1),
    'hvac_visit_core', 'Schedule', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Window',
        'fields', JSON_ARRAY('taskId', 'requestedStartUtc', 'requestedEndUtc', 'priority'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_visit_id AND `view_key` = 'demo_hvac_visit_detail' LIMIT 1),
    'hvac_visit_prefs', 'Dispatch prefs', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Prefs (demo meta; may not persist on schedule SoR)',
        'fields', JSON_ARRAY('visit_window', 'dispatch_priority'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_visit_id AND `view_key` = 'demo_hvac_visit_form' LIMIT 1),
    'hvac_visit_core', 'Schedule', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Window',
        'fields', JSON_ARRAY('taskId', 'requestedStartUtc', 'requestedEndUtc', 'priority'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_visit_id AND `view_key` = 'demo_hvac_visit_form' LIMIT 1),
    'hvac_visit_prefs', 'Dispatch prefs', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Prefs (demo meta; may not persist on schedule SoR)',
        'fields', JSON_ARRAY('visit_window', 'dispatch_priority'))))), 2),

  -- Survey
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_survey_id AND `view_key` = 'demo_hvac_survey_form' LIMIT 1),
    'hvac_survey_site', 'Site', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Site survey',
        'fields', JSON_ARRAY('sq_ft', 'existing_system_type', 'duct_condition', 'electrical_panel_amps', 'recommended_tonnage', 'survey_notes'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_survey_id AND `view_key` = 'demo_hvac_survey_detail' LIMIT 1),
    'hvac_survey_site', 'Site', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Site survey',
        'fields', JSON_ARRAY('sq_ft', 'existing_system_type', 'duct_condition', 'electrical_panel_amps', 'recommended_tonnage', 'survey_notes'))))), 1),

  -- Checklist
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_checklist_id AND `view_key` = 'demo_hvac_checklist_form' LIMIT 1),
    'hvac_checklist_commission', 'Commissioning', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Commissioning',
        'fields', JSON_ARRAY('refrigerant_leak_test', 'static_pressure_ok', 'thermostat_commissioned', 'customer_walkthrough_done', 'photos_attached'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_checklist_id AND `view_key` = 'demo_hvac_checklist_detail' LIMIT 1),
    'hvac_checklist_commission', 'Commissioning', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Commissioning',
        'fields', JSON_ARRAY('refrigerant_leak_test', 'static_pressure_ok', 'thermostat_commissioned', 'customer_walkthrough_done', 'photos_attached'))))), 1),

  -- Registration (password only on form create; omitted from detail)
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_reg_id AND `view_key` = 'demo_hvac_reg_form' LIMIT 1),
    'hvac_reg_company', 'Company', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Company',
        'fields', JSON_ARRAY('company_name', 'tenant_identifier', 'tenant_type_id'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_reg_id AND `view_key` = 'demo_hvac_reg_form' LIMIT 1),
    'hvac_reg_admin', 'Admin', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Admin',
        'fields', JSON_ARRAY('admin_email', 'admin_username', 'admin_first_name', 'admin_last_name', 'admin_password'))))), 2),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_reg_id AND `view_key` = 'demo_hvac_reg_detail' LIMIT 1),
    'hvac_reg_company', 'Company', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Company',
        'fields', JSON_ARRAY('company_name', 'tenant_identifier', 'tenant_type_id'))))), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @hvac_reg_id AND `view_key` = 'demo_hvac_reg_detail' LIMIT 1),
    'hvac_reg_admin_ro', 'Admin', 'form-section',
    JSON_OBJECT('schemaVersion', 1, 'displayMode', 'form-section', 'dataBinding', 'main',
      'layout', JSON_OBJECT('sections', JSON_ARRAY(JSON_OBJECT(
        'title', 'Admin',
        'fields', JSON_ARRAY('admin_email', 'admin_username', 'admin_first_name', 'admin_last_name'))))), 2);

-- Hide system verification fields from default forms (not editable in OD/runner UX).
INSERT INTO `config_object_field_rules` (
  `config_object_field_id`, `lifecycle_state_key`, `role_key`,
  `is_visible`, `is_readonly`, `is_required`, `rules_json`
)
SELECT f.`config_object_field_id`, NULL, NULL, 0, 1, 0, NULL
FROM `config_object_fields` f
WHERE f.`config_object_id` = @hvac_customer_id
  AND f.`field_key` IN ('verification_token', 'token_expires_at', 'email_verified')
  AND NOT EXISTS (
    SELECT 1 FROM `config_object_field_rules` r
    WHERE r.`config_object_field_id` = f.`config_object_field_id`
      AND r.`lifecycle_state_key` IS NULL
      AND r.`role_key` IS NULL
  );

SET FOREIGN_KEY_CHECKS = 1;
