--
-- Seed data for configurable object layer
-- Provides a minimal default template set and object schemas
-- for `project`, `task`, `customer`, and `customer_contact`.
--

SET FOREIGN_KEY_CHECKS = 0;

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
  (1, 'default_core_objects', 'Default Core Objects', 'Default configuration for projects, tasks, customers, and contacts', 'PUBLISHED', 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET @template_set_id := (
  SELECT `config_template_set_id`
  FROM `config_template_sets`
  WHERE `tenant_id` = 1 AND `key` = 'default_core_objects'
  LIMIT 1
);

INSERT INTO `config_objects` (
  `config_template_set_id`,
  `object_type`,
  `sor_table_name`,
  `display_name`,
  `description`,
  `status`,
  `created_at`,
  `updated_at`
) VALUES
  (@template_set_id, 'project', 'projects', 'Project', 'Configurable project fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'task', 'tasks', 'Task', 'Configurable task fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'customer', 'customers', 'Customer', 'Configurable customer fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'customer_contact', 'customer_contact_info', 'Customer Contact', 'Configurable contact fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'resource', 'resources', 'Resource', 'Configurable resource fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'scheduled_task', 'scheduled_tasks', 'Scheduled Task', 'Configurable scheduled task fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'shared_resource', 'shared_resources', 'Shared Resource', 'Configurable shared resource fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'shared_project', 'shared_projects', 'Shared Project', 'Configurable shared project fields', 'PUBLISHED', NOW(), NOW()),
  (@template_set_id, 'shared_task', 'shared_tasks', 'Shared Task', 'Configurable shared task fields', 'PUBLISHED', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `description` = VALUES(`description`),
  `status` = VALUES(`status`),
  `updated_at` = VALUES(`updated_at`);

SET @project_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'project'
  LIMIT 1
);

SET @task_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'task'
  LIMIT 1
);

SET @customer_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'customer'
  LIMIT 1
);

UPDATE `config_objects`
SET `verification_field_map` = JSON_OBJECT(
  'tokenField', 'verification_token',
  'expiresAtField', 'token_expires_at',
  'verifiedField', 'email_verified',
  'defaultTtlHours', 24
)
WHERE `config_object_id` = @customer_object_id
  AND `verification_field_map` IS NULL;

INSERT INTO `config_object_verification_rules` (
  `config_object_id`,
  `trigger_key`,
  `when_json`,
  `then_json`,
  `is_active`
)
SELECT
  @customer_object_id,
  'verify_email',
  JSON_OBJECT(
    'and',
    JSON_ARRAY(
      JSON_OBJECT('==', JSON_ARRAY(JSON_OBJECT('var', 'record.verification_token'), JSON_OBJECT('var', 'input.token'))),
      JSON_OBJECT('>', JSON_ARRAY(JSON_OBJECT('var', 'record.token_expires_at'), JSON_OBJECT('var', 'now'))),
      JSON_OBJECT('!', JSON_ARRAY(JSON_OBJECT('var', 'record.email_verified')))
    )
  ),
  JSON_OBJECT(
    'set',
    JSON_OBJECT(
      'email_verified', true,
      'verification_token', NULL,
      'token_expires_at', NULL
    ),
    'emit', 'six1-event.sor_bound_instance.updated'
  ),
  1
WHERE @customer_object_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  `when_json` = VALUES(`when_json`),
  `then_json` = VALUES(`then_json`),
  `is_active` = VALUES(`is_active`);

SET @customer_contact_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'customer_contact'
  LIMIT 1
);

SET @resource_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'resource'
  LIMIT 1
);

SET @scheduled_task_object_id := (
  SELECT `config_object_id`
  FROM `config_objects`
  WHERE `config_template_set_id` = @template_set_id AND `object_type` = 'scheduled_task'
  LIMIT 1
);

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
  (@project_object_id, 'project_type', 'Project Type', 'Type of project (internal, customer, maintenance)', 'select',
    JSON_OBJECT('enum', JSON_ARRAY('internal', 'customer', 'maintenance')),
    JSON_QUOTE('customer'),
    0, 0, 10, 'summary', 1, 1, NOW(), NOW()),
  (@task_object_id, 'story_points', 'Story Points', 'Relative estimate for agile tasks', 'number',
    JSON_OBJECT('minimum', 0),
    JSON_EXTRACT('0', '$'),
    0, 0, 10, 'planning', 1, 1, NOW(), NOW()),
  (@customer_object_id, 'segment', 'Customer Segment', 'Segment such as SMB, Mid-market, Enterprise', 'select',
    JSON_OBJECT('enum', JSON_ARRAY('SMB', 'Mid-market', 'Enterprise')),
    JSON_QUOTE('SMB'),
    0, 0, 10, 'profile', 1, 1, NOW(), NOW()),
  (@customer_object_id, 'verification_token', 'Verification Token', 'System-managed email verification token', 'text',
    JSON_OBJECT('ui', JSON_OBJECT('hidden', true)),
    NULL,
    0, 1, 1, '__verification', 1, 1, NOW(), NOW()),
  (@customer_object_id, 'token_expires_at', 'Token Expires At', 'System-managed verification token expiry (ISO datetime)', 'datetime',
    JSON_OBJECT('ui', JSON_OBJECT('hidden', true)),
    NULL,
    0, 1, 2, '__verification', 1, 1, NOW(), NOW()),
  (@customer_object_id, 'email_verified', 'Email Verified', 'Whether the primary email has been verified', 'boolean',
    JSON_OBJECT('ui', JSON_OBJECT('hidden', true)),
    JSON_EXTRACT('false', '$'),
    0, 1, 3, '__verification', 1, 1, NOW(), NOW()),
  (@customer_contact_object_id, 'preferred_contact_channel', 'Preferred Contact Channel', 'Primary channel for communication', 'select',
    JSON_OBJECT('enum', JSON_ARRAY('email', 'phone', 'sms')),
    JSON_QUOTE('email'),
    0, 0, 10, 'profile', 1, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `validation_json` = VALUES(`validation_json`),
  `default_value` = VALUES(`default_value`),
  `is_required` = VALUES(`is_required`),
  `order_index` = VALUES(`order_index`),
  `section_key` = VALUES(`section_key`),
  `updated_by` = VALUES(`updated_by`),
  `updated_at` = VALUES(`updated_at`);

SET @sample_project_id := 1;
SET @sample_task_id := 1;
SET @sample_customer_id := 1;
SET @sample_contact_id := 1;

INSERT INTO `project_meta` (
  `project_id`,
  `meta_json`,
  `created_at`,
  `updated_at`
) VALUES
  (@sample_project_id, JSON_OBJECT('project_type', 'customer'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `meta_json` = VALUES(`meta_json`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `task_meta` (
  `task_id`,
  `meta_json`,
  `created_at`,
  `updated_at`
) VALUES
  (@sample_task_id, JSON_OBJECT('story_points', 5), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `meta_json` = VALUES(`meta_json`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `customer_meta` (
  `customer_id`,
  `meta_json`,
  `created_at`,
  `updated_at`
) VALUES
  (@sample_customer_id, JSON_OBJECT('segment', 'SMB'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `meta_json` = VALUES(`meta_json`),
  `updated_at` = VALUES(`updated_at`);

INSERT INTO `customer_contact_info_meta` (
  `customer_contact_id`,
  `meta_json`,
  `created_at`,
  `updated_at`
) VALUES
  (@sample_contact_id, JSON_OBJECT('preferred_contact_channel', 'email'), NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `meta_json` = VALUES(`meta_json`),
  `updated_at` = VALUES(`updated_at`);

--
-- Seed basic lifecycles for project and task objects
--

INSERT INTO `config_object_lifecycles` (
  `config_object_id`,
  `state_key`,
  `label`,
  `description`,
  `order_index`
) VALUES
  (@project_object_id, 'active', 'Active', 'Active project in execution', 1),
  (@project_object_id, 'on_hold', 'On Hold', 'Temporarily paused project', 2),
  (@project_object_id, 'completed', 'Completed', 'Finished project', 3),
  (@project_object_id, 'canceled', 'Canceled', 'Canceled project', 4),
  (@project_object_id, 'archived', 'Archived', 'Archived project', 5),
  (@task_object_id, 'pending', 'Pending', 'Task is not yet ready to start', 1),
  (@task_object_id, 'ready', 'Ready', 'Task is ready to be worked on', 2),
  (@task_object_id, 'in_progress', 'In Progress', 'Task currently in progress', 3),
  (@task_object_id, 'blocked', 'Blocked', 'Task is blocked by some dependency', 4),
  (@task_object_id, 'completed', 'Completed', 'Task has been completed', 5),
  (@task_object_id, 'canceled', 'Canceled', 'Task has been canceled', 6)
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `order_index` = VALUES(`order_index`);

--
-- Seed basic project lifecycles transitions (allowing linear progression and backtracking)
--

INSERT INTO `config_object_lifecycle_transitions` (
  `config_object_id`,
  `from_state_key`,
  `to_state_key`,
  `rules_json`
) VALUES
  (@project_object_id, 'active', 'on_hold', NULL),
  (@project_object_id, 'on_hold', 'active', NULL),
  (@project_object_id, 'active', 'completed', NULL),
  (@project_object_id, 'on_hold', 'completed', NULL),
  (@project_object_id, 'active', 'canceled', NULL),
  (@project_object_id, 'on_hold', 'canceled', NULL),
  (@project_object_id, 'completed', 'archived', NULL),
  (@project_object_id, 'canceled', 'archived', NULL)
ON DUPLICATE KEY UPDATE
  `rules_json` = VALUES(`rules_json`);

--
-- Seed basic task lifecycle transitions aligned with engine states
--

INSERT INTO `config_object_lifecycle_transitions` (
  `config_object_id`,
  `from_state_key`,
  `to_state_key`,
  `rules_json`
) VALUES
  (@task_object_id, 'pending', 'ready', NULL),
  (@task_object_id, 'ready', 'in_progress', NULL),
  (@task_object_id, 'in_progress', 'blocked', NULL),
  (@task_object_id, 'blocked', 'in_progress', NULL),
  (@task_object_id, 'in_progress', 'completed', NULL),
  (@task_object_id, 'ready', 'canceled', NULL),
  (@task_object_id, 'in_progress', 'canceled', NULL),
  (@task_object_id, 'blocked', 'canceled', NULL)
ON DUPLICATE KEY UPDATE
  `rules_json` = VALUES(`rules_json`);

--
-- Seed basic relationships for project as a hub object
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
    'project_tasks',
    'Project Tasks',
    'one_to_many',
    JSON_OBJECT(
      'sor_table', 'tasks',
      'foreign_key', 'project_id',
      'local_key', 'project_id'
    ),
    1
  ),
  (
    'project',
    'customer',
    'project_customers',
    'Project Customers',
    'many_to_many',
    JSON_OBJECT(
      'join_table', 'customer_project_members',
      'join_local_key', 'project_id',
      'join_foreign_key', 'customer_id'
    ),
    1
  ),
  (
    'project',
    'customer_contact',
    'project_customer_contacts',
    'Project Customer Contacts',
    'one_to_many',
    JSON_OBJECT(
      'via', 'customer_project_members',
      'target_table', 'customer_contact_info',
      'target_foreign_key', 'customer_id'
    ),
    1
  )
ON DUPLICATE KEY UPDATE
  `display_name` = VALUES(`display_name`),
  `cardinality` = VALUES(`cardinality`),
  `query_config` = VALUES(`query_config`),
  `is_active` = VALUES(`is_active`);

--
-- Seed basic views and panels for project and task objects
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
  (@project_object_id, 'project_list_default', 'list', 'All Projects', 'Default project list view', NULL, 1),
  (@project_object_id, 'project_board_default', 'board', 'Project Board', 'Default project board grouped by status', NULL, 0),
  (@task_object_id, 'task_list_default', 'list', 'All Tasks', 'Default task list view', NULL, 1),
  (@task_object_id, 'task_board_default', 'board', 'Task Board', 'Default task board grouped by status', NULL, 0)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `view_type` = VALUES(`view_type`),
  `is_default` = VALUES(`is_default`);

SET @project_list_view_id := (
  SELECT `config_object_view_id`
  FROM `config_object_views`
  WHERE `config_object_id` = @project_object_id
    AND `view_key` = 'project_list_default'
  LIMIT 1
);

SET @project_board_view_id := (
  SELECT `config_object_view_id`
  FROM `config_object_views`
  WHERE `config_object_id` = @project_object_id
    AND `view_key` = 'project_board_default'
  LIMIT 1
);

SET @task_list_view_id := (
  SELECT `config_object_view_id`
  FROM `config_object_views`
  WHERE `config_object_id` = @task_object_id
    AND `view_key` = 'task_list_default'
  LIMIT 1
);

SET @task_board_view_id := (
  SELECT `config_object_view_id`
  FROM `config_object_views`
  WHERE `config_object_id` = @task_object_id
    AND `view_key` = 'task_board_default'
  LIMIT 1
);

INSERT INTO `config_object_view_panels` (
  `config_object_view_id`,
  `panel_key`,
  `title`,
  `panel_type`,
  `layout_config`,
  `order_index`
) VALUES
  (
    @project_list_view_id,
    'project_summary',
    'Project Summary',
    'summary',
    JSON_OBJECT(
      'columns',
      JSON_ARRAY('name', 'status', 'tasks_total', 'tasks_completed')
    ),
    1
  ),
  (
    @project_board_view_id,
    'project_board_columns',
    'Project Board Columns',
    'section',
    JSON_OBJECT(
      'group_by', 'status',
      'order', JSON_ARRAY('active', 'on_hold', 'completed', 'canceled', 'archived')
    ),
    1
  ),
  (
    @task_list_view_id,
    'task_summary',
    'Task Summary',
    'summary',
    JSON_OBJECT(
      'columns',
      JSON_ARRAY('name', 'task_status_id', 'priority', 'estimated_duration')
    ),
    1
  ),
  (
    @task_board_view_id,
    'task_board_columns',
    'Task Board Columns',
    'section',
    JSON_OBJECT(
      'group_by', 'lifecycle_state',
      'order', JSON_ARRAY('pending', 'ready', 'in_progress', 'blocked', 'completed', 'canceled')
    ),
    1
  )
ON DUPLICATE KEY UPDATE
  `title` = VALUES(`title`),
  `panel_type` = VALUES(`panel_type`),
  `layout_config` = VALUES(`layout_config`),
  `order_index` = VALUES(`order_index`);

SET FOREIGN_KEY_CHECKS = 1;

