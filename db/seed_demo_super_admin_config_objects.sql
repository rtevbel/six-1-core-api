--
-- Super-admin / global demo: configurable object template sets (tenant_id NULL)
-- Includes: template sets, objects, fields (with validation_json), lifecycles,
--           transitions, config_object_field_rules (with rules_json),
--           config_object_relationships (query_config aligned with ConfigObjectsService),
--           config_object_views + config_object_view_panels
--
-- Prerequisites:
--   - Migrations applied (config_* tables, nullable tenant_id on config_template_sets)
--   - At least one row in tenant_users (created_by / updated_by FKs)
--
-- Relationship keys use prefix demo_ps_ / demo_fs_ to avoid colliding with tenant seeds.
-- query_config matches resolver branches: FK, join_table+target_table, via+join_local_key.
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
) VALUES
  (
    NULL,
    'industry_ps_delivery',
    'Demo - Professional services (IT & consulting)',
    'Global demo template: retainers, sprints, account fields. For super-admin / client demos.',
    'PUBLISHED',
    @creator_tu,
    @creator_tu,
    NOW(6),
    NOW(6)
  ),
  (
    NULL,
    'industry_field_services',
    'Demo - Field services & construction',
    'Global demo template: jobsites, work orders, safety. For super-admin / client demos.',
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

SET @ps_tid := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'industry_ps_delivery' LIMIT 1
);

SET @fs_tid := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'industry_field_services' LIMIT 1
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
  (@ps_tid, 'project', 'sor_bound', 'projects', 'Project', 'PS delivery project', 'PUBLISHED', NOW(6), NOW(6)),
  (@ps_tid, 'task', 'sor_bound', 'tasks', 'Task', 'PS delivery task', 'PUBLISHED', NOW(6), NOW(6)),
  (@ps_tid, 'customer', 'sor_bound', 'customers', 'Customer', 'PS account', 'PUBLISHED', NOW(6), NOW(6)),
  (@ps_tid, 'customer_contact', 'sor_bound', 'customer_contact_info', 'Customer Contact', 'PS stakeholder contact', 'PUBLISHED', NOW(6), NOW(6)),
  (@ps_tid, 'resource', 'sor_bound', 'resources', 'Resource', 'PS resource', 'PUBLISHED', NOW(6), NOW(6)),
  (@fs_tid, 'project', 'sor_bound', 'projects', 'Job / Project', 'Field job or construction project', 'PUBLISHED', NOW(6), NOW(6)),
  (@fs_tid, 'task', 'sor_bound', 'tasks', 'Work order task', 'Field task', 'PUBLISHED', NOW(6), NOW(6)),
  (@fs_tid, 'customer', 'sor_bound', 'customers', 'Customer', 'Contracting customer', 'PUBLISHED', NOW(6), NOW(6)),
  (@fs_tid, 'customer_contact', 'sor_bound', 'customer_contact_info', 'Site contact', 'Site or safety contact', 'PUBLISHED', NOW(6), NOW(6)),
  (@fs_tid, 'resource', 'sor_bound', 'resources', 'Resource', 'Crew or equipment resource', 'PUBLISHED', NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `binding_mode` = VALUES(`binding_mode`),
  `sor_table_name` = VALUES(`sor_table_name`),
  `updated_at` = VALUES(`updated_at`);

SET @ps_project_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ps_tid AND `object_type` = 'project' LIMIT 1
);
SET @ps_task_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ps_tid AND `object_type` = 'task' LIMIT 1
);
SET @ps_customer_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ps_tid AND `object_type` = 'customer' LIMIT 1
);
SET @ps_contact_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ps_tid AND `object_type` = 'customer_contact' LIMIT 1
);
SET @ps_resource_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @ps_tid AND `object_type` = 'resource' LIMIT 1
);

SET @fs_project_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @fs_tid AND `object_type` = 'project' LIMIT 1
);
SET @fs_task_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @fs_tid AND `object_type` = 'task' LIMIT 1
);
SET @fs_customer_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @fs_tid AND `object_type` = 'customer' LIMIT 1
);
SET @fs_contact_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @fs_tid AND `object_type` = 'customer_contact' LIMIT 1
);
SET @fs_resource_id := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @fs_tid AND `object_type` = 'resource' LIMIT 1
);

--
-- Fields: every row has non-null validation_json (JSON-schema style hints for UI / server)
--
INSERT INTO `config_object_fields` (
  `config_object_id`,
  `field_key`,
  `label`,
  `description`,
  `field_type`,
  `validation_json`,
  `default_value`,
  `is_required`,
  `is_system`,
  `order_index`,
  `section_key`,
  `created_by`,
  `updated_by`,
  `created_at`,
  `updated_at`
) VALUES
  (@ps_project_id, 'engagement_model', 'Engagement model', 'How the project is sold and delivered', 'select',
    JSON_OBJECT(
      'type', 'string',
      'enum', JSON_ARRAY('time_materials', 'fixed_fee', 'retainer'),
      'x-ui', JSON_OBJECT('widget', 'select', 'help', 'Choose commercial model')
    ),
    JSON_QUOTE('time_materials'), 0, 0, 10, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_project_id, 'sow_reference', 'SOW reference', 'Statement of work ID or URL', 'text',
    JSON_OBJECT(
      'type', 'string',
      'minLength', 0,
      'maxLength', 500,
      'x-ui', JSON_OBJECT('widget', 'text', 'placeholder', 'SOW-2025-001 or https://...')
    ),
    JSON_QUOTE(''), 0, 0, 20, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_project_id, 'billing_code', 'Billing code', 'Finance / ERP billing code', 'text',
    JSON_OBJECT(
      'type', 'string',
      'minLength', 0,
      'maxLength', 64,
      'pattern', '^[A-Z0-9._-]+$',
      'x-ui', JSON_OBJECT('widget', 'text', 'uppercase', TRUE)
    ),
    JSON_QUOTE(''), 0, 0, 30, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_project_id, 'health_rag', 'Health (RAG)', 'Delivery health indicator', 'select',
    JSON_OBJECT(
      'type', 'string',
      'enum', JSON_ARRAY('green', 'amber', 'red'),
      'x-ui', JSON_OBJECT('widget', 'segmented', 'colors', JSON_ARRAY('green', 'amber', 'red'))
    ),
    JSON_QUOTE('green'), 0, 0, 40, 'delivery', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_task_id, 'story_points', 'Story points', 'Relative estimate', 'number',
    JSON_OBJECT(
      'type', 'number',
      'minimum', 0,
      'maximum', 100,
      'multipleOf', 0.5,
      'x-ui', JSON_OBJECT('widget', 'number', 'step', 0.5)
    ),
    JSON_EXTRACT('0', '$'), 0, 0, 10, 'planning', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_task_id, 'billable', 'Billable', 'Whether work is billable to client', 'boolean',
    JSON_OBJECT('type', 'boolean', 'x-ui', JSON_OBJECT('widget', 'switch')),
    CAST(TRUE AS JSON), 0, 0, 20, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_task_id, 'client_visible', 'Client visible', 'Shown on client reports / portal', 'boolean',
    JSON_OBJECT('type', 'boolean', 'x-ui', JSON_OBJECT('widget', 'switch')),
    CAST(FALSE AS JSON), 0, 0, 30, 'delivery', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_customer_id, 'account_tier', 'Account tier', 'Strategic importance', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('strategic', 'growth', 'standard')),
    JSON_QUOTE('standard'), 0, 0, 10, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_customer_id, 'csm_owner', 'CSM owner', 'Customer success owner (label or id)', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 120),
    JSON_QUOTE(''), 0, 0, 20, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_contact_id, 'role_in_buying_process', 'Buying role', 'Stakeholder role', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('champion', 'economic_buyer', 'influencer', 'user')),
    JSON_QUOTE('user'), 0, 0, 10, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_contact_id, 'slack_or_teams_id', 'Chat ID', 'Slack or Teams handle', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 100, 'pattern', '^[@#A-Za-z0-9._-]*$'),
    JSON_QUOTE(''), 0, 0, 20, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@ps_resource_id, 'skills_tags', 'Skills tags', 'Skill labels for scheduling', 'json',
    JSON_OBJECT(
      'type', 'array',
      'items', JSON_OBJECT('type', 'string', 'maxLength', 64),
      'maxItems', 20,
      'uniqueItems', TRUE
    ),
    JSON_ARRAY(), 0, 0, 10, 'capacity', @creator_tu, @creator_tu, NOW(6), NOW(6)),

  (@fs_project_id, 'job_number', 'Job number', 'External job or contract number', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 80, 'pattern', '^[A-Z0-9._/-]*$'),
    JSON_QUOTE(''), 0, 0, 10, 'job', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_project_id, 'site_address', 'Site address', 'Jobsite location', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 500),
    JSON_QUOTE(''), 0, 0, 20, 'job', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_project_id, 'permit_id', 'Permit ID', 'Building or work permit reference', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 120),
    JSON_QUOTE(''), 0, 0, 30, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_project_id, 'gc_name', 'General contractor', 'GC company name', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 200),
    JSON_QUOTE(''), 0, 0, 40, 'job', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_project_id, 'weather_sensitive', 'Weather sensitive', 'Work affected by weather', 'boolean',
    JSON_OBJECT('type', 'boolean'),
    CAST(FALSE AS JSON), 0, 0, 50, 'planning', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_task_id, 'work_order_id', 'Work order ID', 'External WO reference', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 64, 'pattern', '^[A-Z0-9._-]+$'),
    JSON_QUOTE(''), 0, 0, 10, 'operations', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_task_id, 'crew_size', 'Crew size', 'Planned headcount', 'number',
    JSON_OBJECT('type', 'integer', 'minimum', 0, 'maximum', 500),
    JSON_EXTRACT('0', '$'), 0, 0, 20, 'operations', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_task_id, 'ppe_required', 'PPE required', 'Personal protective equipment required', 'boolean',
    JSON_OBJECT('type', 'boolean', 'x-ui', JSON_OBJECT('widget', 'switch', 'severity', 'high')),
    CAST(TRUE AS JSON), 0, 0, 30, 'safety', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_customer_id, 'billing_entity', 'Billing entity', 'Legal entity for invoicing', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 200),
    JSON_QUOTE(''), 0, 0, 10, 'commercial', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_customer_id, 'safety_tier', 'Safety tier', 'Customer site safety classification', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('standard', 'high', 'restricted_site')),
    JSON_QUOTE('standard'), 0, 0, 20, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_customer_id, 'insurance_expiry', 'Insurance expiry', 'COI or liability expiry', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date', 'x-ui', JSON_OBJECT('widget', 'date')),
    JSON_QUOTE('2099-12-31'), 0, 0, 30, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_contact_id, 'site_role', 'Site role', 'Role on site', 'select',
    JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('site_super', 'safety', 'owner_rep', 'other')),
    JSON_QUOTE('other'), 0, 0, 10, 'profile', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_contact_id, 'emergency_phone', 'Emergency phone', '24h or site emergency line', 'text',
    JSON_OBJECT('type', 'string', 'minLength', 0, 'maxLength', 32, 'pattern', '^[+0-9().\\s-]+$'),
    JSON_QUOTE(''), 0, 0, 20, 'safety', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_contact_id, 'badge_required', 'Badge required', 'Site access badge mandatory', 'boolean',
    JSON_OBJECT('type', 'boolean'),
    CAST(FALSE AS JSON), 0, 0, 30, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6)),
  (@fs_resource_id, 'equipment_cert_expiry', 'Equipment cert expiry', 'Certification for assigned equipment', 'date',
    JSON_OBJECT('type', 'string', 'format', 'date'),
    JSON_QUOTE('2099-12-31'), 0, 0, 10, 'compliance', @creator_tu, @creator_tu, NOW(6), NOW(6))
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `field_type` = VALUES(`field_type`),
  `validation_json` = VALUES(`validation_json`),
  `default_value` = VALUES(`default_value`),
  `is_required` = VALUES(`is_required`),
  `order_index` = VALUES(`order_index`),
  `section_key` = VALUES(`section_key`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET @ps_f_engagement := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_project_id AND `field_key` = 'engagement_model' LIMIT 1);
SET @ps_f_sow := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_project_id AND `field_key` = 'sow_reference' LIMIT 1);
SET @ps_f_billing := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_project_id AND `field_key` = 'billing_code' LIMIT 1);
SET @ps_f_health := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_project_id AND `field_key` = 'health_rag' LIMIT 1);
SET @ps_f_story := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_task_id AND `field_key` = 'story_points' LIMIT 1);
SET @ps_f_billable := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_task_id AND `field_key` = 'billable' LIMIT 1);
SET @ps_f_tier := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @ps_customer_id AND `field_key` = 'account_tier' LIMIT 1);

SET @fs_f_site := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @fs_project_id AND `field_key` = 'site_address' LIMIT 1);
SET @fs_f_permit := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @fs_project_id AND `field_key` = 'permit_id' LIMIT 1);
SET @fs_f_ppe := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @fs_task_id AND `field_key` = 'ppe_required' LIMIT 1);
SET @fs_f_wo := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @fs_task_id AND `field_key` = 'work_order_id' LIMIT 1);
SET @fs_f_safety_tier := (SELECT `config_object_field_id` FROM `config_object_fields` WHERE `config_object_id` = @fs_customer_id AND `field_key` = 'safety_tier' LIMIT 1);

DELETE r FROM `config_object_field_rules` r
INNER JOIN `config_object_fields` f ON f.`config_object_field_id` = r.`config_object_field_id`
INNER JOIN `config_objects` o ON o.`config_object_id` = f.`config_object_id`
WHERE o.`config_template_set_id` IN (@ps_tid, @fs_tid)
  AND f.`field_key` IN (
    'engagement_model', 'sow_reference', 'billing_code', 'health_rag',
    'story_points', 'billable', 'account_tier',
    'site_address', 'permit_id', 'ppe_required', 'work_order_id', 'safety_tier'
  );

INSERT INTO `config_object_field_rules` (
  `config_object_field_id`,
  `lifecycle_state_key`,
  `role_key`,
  `is_visible`,
  `is_readonly`,
  `is_required`,
  `rules_json`
) VALUES
  (@ps_f_billing, NULL, 'viewer', 1, 1, 0,
    JSON_OBJECT('note', 'Finance codes are read-only for viewers', 'severity', 'info')),
  (@ps_f_billing, NULL, 'project_manager', 1, 0, 0,
    JSON_OBJECT('validation_override', JSON_OBJECT('pattern', '^[A-Z0-9._-]{3,64}$'))),
  (@ps_f_sow, 'completed', NULL, 1, 1, 0,
    JSON_OBJECT('note', 'SOW locked after completion', 'lock_reason', 'lifecycle')),
  (@ps_f_health, 'on_hold', NULL, 1, 0, 1,
    JSON_OBJECT('note', 'RAG required when on hold', 'severity', 'warning')),
  (@ps_f_story, 'completed', NULL, 1, 1, 0,
    JSON_OBJECT('note', 'Points frozen after complete')),
  (@ps_f_story, 'in_progress', NULL, 1, 0, 0,
    JSON_OBJECT('validation_override', JSON_OBJECT('maximum', 21))),
  (@ps_f_billable, NULL, 'viewer', 1, 1, 0,
    JSON_OBJECT('note', 'Commercial flags hidden from edit for viewers')),
  (@ps_f_engagement, NULL, 'super_admin', 1, 0, 0,
    JSON_OBJECT('note', 'Commercial model editable by super admin', 'priority', 1)),
  (@ps_f_tier, NULL, 'viewer', 1, 1, 0, JSON_OBJECT('note', 'Tier read-only')),
  (@ps_f_tier, NULL, 'super_admin', 1, 0, 1, JSON_OBJECT('note', 'Tier required for strategic accounts')),

  (@fs_f_permit, 'closed', NULL, 1, 1, 0,
    JSON_OBJECT('note', 'Permit reference locked when job closed', 'lock_reason', 'lifecycle')),
  (@fs_f_site, 'closed', NULL, 1, 1, 0,
    JSON_OBJECT('note', 'Site address locked after close')),
  (@fs_f_ppe, NULL, 'viewer', 1, 1, 0,
    JSON_OBJECT('note', 'Safety flags managed by field leads', 'severity', 'warning')),
  (@fs_f_ppe, NULL, 'field_supervisor', 1, 0, 1,
    JSON_OBJECT('note', 'Supervisor confirms PPE', 'validation_override', JSON_OBJECT('const', TRUE))),
  (@fs_f_wo, 'awaiting_inspection', NULL, 1, 1, 0,
    JSON_OBJECT('note', 'WO id fixed during inspection')),
  (@fs_f_safety_tier, NULL, 'viewer', 1, 1, 0, NULL),
  (@fs_f_safety_tier, NULL, 'field_supervisor', 1, 0, 1,
    JSON_OBJECT('note', 'Supervisor must confirm safety tier for restricted sites', 'when_meta', JSON_OBJECT('safety_tier', 'restricted_site')));

INSERT INTO `config_object_lifecycles` (
  `config_object_id`,
  `state_key`,
  `label`,
  `description`,
  `order_index`
) VALUES
  (@ps_project_id, 'active', 'Active', 'In delivery', 1),
  (@ps_project_id, 'on_hold', 'On hold', 'Paused', 2),
  (@ps_project_id, 'completed', 'Completed', 'Done', 3),
  (@ps_project_id, 'canceled', 'Canceled', 'Canceled', 4),
  (@ps_project_id, 'archived', 'Archived', 'Archived', 5),
  (@ps_task_id, 'pending', 'Pending', 'Not started', 1),
  (@ps_task_id, 'ready', 'Ready', 'Ready to work', 2),
  (@ps_task_id, 'in_progress', 'In progress', 'Active', 3),
  (@ps_task_id, 'blocked', 'Blocked', 'Blocked', 4),
  (@ps_task_id, 'completed', 'Completed', 'Done', 5),
  (@ps_task_id, 'canceled', 'Canceled', 'Canceled', 6),

  (@fs_project_id, 'bid', 'Bid / estimate', 'Pre-award', 1),
  (@fs_project_id, 'scheduled', 'Scheduled', 'Awarded, scheduled', 2),
  (@fs_project_id, 'in_progress', 'In progress', 'Work ongoing', 3),
  (@fs_project_id, 'punch_list', 'Punch list', 'Close-out items', 4),
  (@fs_project_id, 'closed', 'Closed', 'Job closed', 5),
  (@fs_task_id, 'dispatched', 'Dispatched', 'Crew assigned', 1),
  (@fs_task_id, 'on_site', 'On site', 'Work in progress on site', 2),
  (@fs_task_id, 'awaiting_inspection', 'Awaiting inspection', 'QA / inspection', 3),
  (@fs_task_id, 'completed', 'Completed', 'Done', 4),
  (@fs_task_id, 'canceled', 'Canceled', 'Canceled', 5)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `order_index` = VALUES(`order_index`);

INSERT INTO `config_object_lifecycle_transitions` (
  `config_object_id`,
  `from_state_key`,
  `to_state_key`,
  `rules_json`
) VALUES
  (@ps_project_id, 'active', 'on_hold', NULL),
  (@ps_project_id, 'on_hold', 'active', NULL),
  (@ps_project_id, 'active', 'completed', NULL),
  (@ps_project_id, 'on_hold', 'completed', NULL),
  (@ps_project_id, 'active', 'canceled', NULL),
  (@ps_project_id, 'completed', 'archived', NULL),
  (@ps_project_id, 'canceled', 'archived', NULL),
  (@ps_task_id, 'pending', 'ready', NULL),
  (@ps_task_id, 'ready', 'in_progress', NULL),
  (@ps_task_id, 'in_progress', 'blocked', NULL),
  (@ps_task_id, 'blocked', 'in_progress', NULL),
  (@ps_task_id, 'in_progress', 'completed', NULL),
  (@ps_task_id, 'ready', 'canceled', NULL),

  (@fs_project_id, 'bid', 'scheduled', NULL),
  (@fs_project_id, 'scheduled', 'in_progress', NULL),
  (@fs_project_id, 'in_progress', 'punch_list', NULL),
  (@fs_project_id, 'punch_list', 'closed', NULL),
  (@fs_task_id, 'dispatched', 'on_site', NULL),
  (@fs_task_id, 'on_site', 'awaiting_inspection', NULL),
  (@fs_task_id, 'awaiting_inspection', 'completed', NULL),
  (@fs_task_id, 'dispatched', 'canceled', NULL),
  (@fs_task_id, 'on_site', 'canceled', NULL)
ON DUPLICATE KEY UPDATE
  `rules_json` = VALUES(`rules_json`);

--
-- Relationships: query_config must satisfy ConfigObjectsService.getRelatedObjects branches.
-- join_table path requires target_table (+ optional target_primary_key).
-- via path requires join_local_key on the via table (e.g. project_id).
--

INSERT INTO `config_object_relationships` (
  `from_object_type`,
  `to_object_type`,
  `relationship_key`,
  `display_name`,
  `cardinality`,
  `query_config`,
  `is_active`
) VALUES
  (
    'project',
    'task',
    'demo_ps_project_tasks',
    'Demo PS - Project tasks',
    'one_to_many',
    JSON_OBJECT(
      'sor_table', 'tasks',
      'foreign_key', 'project_id',
      'local_key', 'project_id',
      'demo_template_key', 'industry_ps_delivery'
    ),
    1
  ),
  (
    'project',
    'customer',
    'demo_ps_project_customers',
    'Demo PS - Project customers',
    'many_to_many',
    JSON_OBJECT(
      'join_table', 'customer_project_members',
      'join_local_key', 'project_id',
      'join_foreign_key', 'customer_id',
      'target_table', 'customers',
      'target_primary_key', 'customer_id',
      'demo_template_key', 'industry_ps_delivery'
    ),
    1
  ),
  (
    'project',
    'customer_contact',
    'demo_ps_project_contacts',
    'Demo PS - Project customer contacts',
    'one_to_many',
    JSON_OBJECT(
      'via', 'customer_project_members',
      'join_local_key', 'project_id',
      'target_table', 'customer_contact_info',
      'target_foreign_key', 'customer_id',
      'demo_template_key', 'industry_ps_delivery'
    ),
    1
  ),
  (
    'customer',
    'customer_contact',
    'demo_ps_customer_contacts',
    'Demo PS - Account contacts',
    'one_to_many',
    JSON_OBJECT(
      'sor_table', 'customer_contact_info',
      'foreign_key', 'customer_id',
      'local_key', 'customer_id',
      'demo_template_key', 'industry_ps_delivery'
    ),
    1
  ),

  (
    'project',
    'task',
    'demo_fs_project_tasks',
    'Demo FS - Job tasks',
    'one_to_many',
    JSON_OBJECT(
      'sor_table', 'tasks',
      'foreign_key', 'project_id',
      'local_key', 'project_id',
      'demo_template_key', 'industry_field_services'
    ),
    1
  ),
  (
    'project',
    'customer',
    'demo_fs_project_customers',
    'Demo FS - Job customers',
    'many_to_many',
    JSON_OBJECT(
      'join_table', 'customer_project_members',
      'join_local_key', 'project_id',
      'join_foreign_key', 'customer_id',
      'target_table', 'customers',
      'target_primary_key', 'customer_id',
      'demo_template_key', 'industry_field_services'
    ),
    1
  ),
  (
    'project',
    'customer_contact',
    'demo_fs_project_contacts',
    'Demo FS - Job site contacts',
    'one_to_many',
    JSON_OBJECT(
      'via', 'customer_project_members',
      'join_local_key', 'project_id',
      'target_table', 'customer_contact_info',
      'target_foreign_key', 'customer_id',
      'demo_template_key', 'industry_field_services'
    ),
    1
  ),
  (
    'customer',
    'project',
    'demo_fs_customer_projects',
    'Demo FS - Customer jobs',
    'many_to_many',
    JSON_OBJECT(
      'join_table', 'customer_project_members',
      'join_local_key', 'customer_id',
      'join_foreign_key', 'project_id',
      'target_table', 'projects',
      'target_primary_key', 'project_id',
      'demo_template_key', 'industry_field_services'
    ),
    1
  ),
  (
    'customer',
    'customer_contact',
    'demo_fs_customer_contacts',
    'Demo FS - Customer site contacts',
    'one_to_many',
    JSON_OBJECT(
      'sor_table', 'customer_contact_info',
      'foreign_key', 'customer_id',
      'local_key', 'customer_id',
      'demo_template_key', 'industry_field_services'
    ),
    1
  )
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

--
-- Views + panels (per config object - list / board / detail where useful)
--

INSERT INTO `config_object_views` (
  `config_object_id`,
  `view_key`,
  `view_type`,
  `name`,
  `description`,
  `role_key`,
  `is_default`
) VALUES
  (@ps_project_id, 'demo_ps_project_list', 'list', 'PS Projects - List', 'All projects with commercial meta columns', NULL, 1),
  (@ps_project_id, 'demo_ps_project_board', 'board', 'PS Projects - Board', 'Board by lifecycle / RAG', NULL, 0),
  (@ps_project_id, 'demo_ps_project_detail', 'detail', 'PS Project - Detail', 'Detail layout for delivery fields', NULL, 0),
  (@ps_task_id, 'demo_ps_task_list', 'list', 'PS Tasks - List', 'Tasks with story points & billable', NULL, 1),
  (@ps_task_id, 'demo_ps_task_board', 'board', 'PS Tasks - Board', 'Kanban by task lifecycle', NULL, 0),
  (@ps_customer_id, 'demo_ps_customer_list', 'list', 'PS Customers - List', 'Accounts with tier', NULL, 1),
  (@ps_customer_id, 'demo_ps_customer_detail', 'detail', 'PS Customer - Detail', 'Account profile', NULL, 0),
  (@ps_contact_id, 'demo_ps_contact_list', 'list', 'PS Contacts - List', 'Stakeholders', NULL, 1),
  (@ps_resource_id, 'demo_ps_resource_list', 'list', 'PS Resources - List', 'Capacity & skills', NULL, 1),

  (@fs_project_id, 'demo_fs_project_list', 'list', 'FS Jobs - List', 'Jobs with job # and site', NULL, 1),
  (@fs_project_id, 'demo_fs_project_board', 'board', 'FS Jobs - Board', 'Board by job phase', NULL, 0),
  (@fs_project_id, 'demo_fs_project_detail', 'detail', 'FS Job - Detail', 'Site & compliance sections', NULL, 0),
  (@fs_task_id, 'demo_fs_task_list', 'list', 'FS Work orders - List', 'Tasks with WO and crew', NULL, 1),
  (@fs_task_id, 'demo_fs_task_board', 'board', 'FS Work orders - Board', 'Field task states', NULL, 0),
  (@fs_customer_id, 'demo_fs_customer_list', 'list', 'FS Customers - List', 'Contractors with safety tier', NULL, 1),
  (@fs_customer_id, 'demo_fs_customer_detail', 'detail', 'FS Customer - Detail', 'Compliance & billing entity', NULL, 0),
  (@fs_contact_id, 'demo_fs_contact_list', 'list', 'FS Site contacts - List', 'Safety contacts', NULL, 1),
  (@fs_resource_id, 'demo_fs_resource_list', 'list', 'FS Resources - List', 'Equipment & certs', NULL, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`,
  `panel_key`,
  `title`,
  `panel_type`,
  `layout_config`,
  `order_index`
) VALUES
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_project_id AND `view_key` = 'demo_ps_project_list' LIMIT 1),
    'ps_proj_list_summary', 'Summary', 'summary',
    JSON_OBJECT(
      'columns', JSON_ARRAY('name', 'status', 'engagement_model', 'health_rag', 'billing_code'),
      'meta_keys', JSON_ARRAY('engagement_model', 'health_rag', 'billing_code')
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_project_id AND `view_key` = 'demo_ps_project_board' LIMIT 1),
    'ps_proj_board', 'By lifecycle', 'section',
    JSON_OBJECT(
      'group_by', 'lifecycle_state',
      'order', JSON_ARRAY('active', 'on_hold', 'completed', 'canceled', 'archived'),
      'swimlane_meta', 'health_rag'
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_project_id AND `view_key` = 'demo_ps_project_detail' LIMIT 1),
    'ps_proj_detail_commercial', 'Commercial', 'section',
    JSON_OBJECT('section_key', 'commercial', 'field_keys', JSON_ARRAY('engagement_model', 'sow_reference', 'billing_code')), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_project_id AND `view_key` = 'demo_ps_project_detail' LIMIT 1),
    'ps_proj_detail_delivery', 'Delivery', 'section',
    JSON_OBJECT('section_key', 'delivery', 'field_keys', JSON_ARRAY('health_rag')), 2),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_task_id AND `view_key` = 'demo_ps_task_list' LIMIT 1),
    'ps_task_list_summary', 'Tasks', 'summary',
    JSON_OBJECT(
      'columns', JSON_ARRAY('name', 'task_status_id', 'priority', 'story_points', 'billable'),
      'meta_keys', JSON_ARRAY('story_points', 'billable', 'client_visible')
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_task_id AND `view_key` = 'demo_ps_task_board' LIMIT 1),
    'ps_task_board', 'By state', 'section',
    JSON_OBJECT(
      'group_by', 'lifecycle_state',
      'order', JSON_ARRAY('pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled')
    ), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_customer_id AND `view_key` = 'demo_ps_customer_list' LIMIT 1),
    'ps_cust_list', 'Accounts', 'summary',
    JSON_OBJECT('columns', JSON_ARRAY('name', 'status'), 'meta_keys', JSON_ARRAY('account_tier', 'csm_owner')), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_customer_id AND `view_key` = 'demo_ps_customer_detail' LIMIT 1),
    'ps_cust_profile', 'Profile', 'section',
    JSON_OBJECT('section_key', 'profile', 'field_keys', JSON_ARRAY('account_tier', 'csm_owner')), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_contact_id AND `view_key` = 'demo_ps_contact_list' LIMIT 1),
    'ps_contact_list', 'Contacts', 'summary',
    JSON_OBJECT('meta_keys', JSON_ARRAY('role_in_buying_process', 'slack_or_teams_id')), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @ps_resource_id AND `view_key` = 'demo_ps_resource_list' LIMIT 1),
    'ps_resource_list', 'Resources', 'summary',
    JSON_OBJECT('meta_keys', JSON_ARRAY('skills_tags')), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_project_id AND `view_key` = 'demo_fs_project_list' LIMIT 1),
    'fs_proj_list', 'Jobs', 'summary',
    JSON_OBJECT(
      'columns', JSON_ARRAY('name', 'status', 'job_number', 'site_address'),
      'meta_keys', JSON_ARRAY('job_number', 'site_address', 'permit_id', 'gc_name', 'weather_sensitive')
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_project_id AND `view_key` = 'demo_fs_project_board' LIMIT 1),
    'fs_proj_board', 'By phase', 'section',
    JSON_OBJECT(
      'group_by', 'lifecycle_state',
      'order', JSON_ARRAY('bid', 'scheduled', 'in_progress', 'punch_list', 'closed')
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_project_id AND `view_key` = 'demo_fs_project_detail' LIMIT 1),
    'fs_proj_job', 'Job site', 'section',
    JSON_OBJECT('section_key', 'job', 'field_keys', JSON_ARRAY('job_number', 'site_address', 'gc_name')), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_project_id AND `view_key` = 'demo_fs_project_detail' LIMIT 1),
    'fs_proj_compliance', 'Compliance', 'section',
    JSON_OBJECT('section_key', 'compliance', 'field_keys', JSON_ARRAY('permit_id')), 2),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_task_id AND `view_key` = 'demo_fs_task_list' LIMIT 1),
    'fs_task_list', 'Work orders', 'summary',
    JSON_OBJECT(
      'columns', JSON_ARRAY('name', 'task_status_id', 'priority'),
      'meta_keys', JSON_ARRAY('work_order_id', 'crew_size', 'ppe_required')
    ), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_task_id AND `view_key` = 'demo_fs_task_board' LIMIT 1),
    'fs_task_board', 'Field states', 'section',
    JSON_OBJECT(
      'group_by', 'lifecycle_state',
      'order', JSON_ARRAY('dispatched', 'on_site', 'awaiting_inspection', 'completed', 'canceled')
    ), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_customer_id AND `view_key` = 'demo_fs_customer_list' LIMIT 1),
    'fs_cust_list', 'Customers', 'summary',
    JSON_OBJECT('meta_keys', JSON_ARRAY('billing_entity', 'safety_tier', 'insurance_expiry')), 1),
  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_customer_id AND `view_key` = 'demo_fs_customer_detail' LIMIT 1),
    'fs_cust_detail', 'Commercial & safety', 'section',
    JSON_OBJECT(
      'field_keys', JSON_ARRAY('billing_entity', 'safety_tier', 'insurance_expiry')
    ), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_contact_id AND `view_key` = 'demo_fs_contact_list' LIMIT 1),
    'fs_contact_list', 'Site contacts', 'summary',
    JSON_OBJECT('meta_keys', JSON_ARRAY('site_role', 'emergency_phone', 'badge_required')), 1),

  ((SELECT `config_object_view_id` FROM `config_object_views` WHERE `config_object_id` = @fs_resource_id AND `view_key` = 'demo_fs_resource_list' LIMIT 1),
    'fs_resource_list', 'Resources', 'summary',
    JSON_OBJECT('meta_keys', JSON_ARRAY('equipment_cert_expiry')), 1)
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

SET FOREIGN_KEY_CHECKS = 1;
