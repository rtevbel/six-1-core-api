--
-- Acme HVAC operational demo data (not SYSTEM tenant 0).
-- Seeds SoR ops data plus standalone survey/checklist/registration instances.
--
-- Prerequisites: lookups/roles; seed_industry_hvac_install.sql; migrations.
-- Demo login: hvac.admin@acmehvac.demo / DemoPass123!
--

SET FOREIGN_KEY_CHECKS = 0;

SET @demo_password := '$2b$10$TvigNLymBlyIZCxY4DblWus2TrCzjVuAqgHveTOEDLilyPBWsPSDa';
SET @creator_tu := (
  SELECT `tenant_user_id` FROM `tenant_users` ORDER BY `tenant_user_id` ASC LIMIT 1
);
SET @status_active := (
  SELECT `status_id` FROM `system_statuses` ORDER BY `status_id` ASC LIMIT 1
);
SET @lang_en := (
  SELECT `language_id` FROM `system_languages` WHERE `lang_code` = 'en' LIMIT 1
);
SET @lang_en := IFNULL(@lang_en, 1);
SET @tenant_type_company := (
  SELECT `tenant_type_id` FROM `tenant_types` WHERE `name` = 'company' LIMIT 1
);
SET @tenant_type_company := IFNULL(@tenant_type_company, (
  SELECT `tenant_type_id` FROM `tenant_types` ORDER BY `tenant_type_id` ASC LIMIT 1
));
SET @role_admin := 2;
SET @role_manager := 3;
SET @role_member := 5;
SET @role_customer := 7;

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'hvac.admin@acmehvac.demo', 'hvac.admin', 'Avery', 'Cole', @demo_password, 1, 'Avery Cole', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'hvac.admin@acmehvac.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'hvac.dispatch@acmehvac.demo', 'hvac.dispatch', 'Devon', 'Park', @demo_password, 1, 'Devon Park', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'hvac.dispatch@acmehvac.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'hvac.north@acmehvac.demo', 'hvac.north', 'Jordan', 'Reyes', @demo_password, 1, 'Jordan Reyes', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'hvac.north@acmehvac.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'hvac.south@acmehvac.demo', 'hvac.south', 'Sam', 'Nguyen', @demo_password, 1, 'Sam Nguyen', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'hvac.south@acmehvac.demo');

SET @u_admin := (SELECT `user_id` FROM `users` WHERE `email` = 'hvac.admin@acmehvac.demo' LIMIT 1);
SET @u_dispatch := (SELECT `user_id` FROM `users` WHERE `email` = 'hvac.dispatch@acmehvac.demo' LIMIT 1);
SET @u_north := (SELECT `user_id` FROM `users` WHERE `email` = 'hvac.north@acmehvac.demo' LIMIT 1);
SET @u_south := (SELECT `user_id` FROM `users` WHERE `email` = 'hvac.south@acmehvac.demo' LIMIT 1);

INSERT INTO `user_roles` (`user_id`, `role_id`, `created_by`, `created_at`)
SELECT @u_admin, @role_admin, @u_admin, NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `user_roles` WHERE `user_id` = @u_admin AND `role_id` = @role_admin
);

INSERT INTO `tenants` (
  `name`, `tenant_type_id`, `tenant_indentifier`, `user_id`, `status_id`, `created_at`, `updated_at`
)
SELECT 'Acme HVAC', @tenant_type_company, 'acme-hvac', @u_admin, @status_active, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenants` WHERE `tenant_indentifier` = 'acme-hvac');

SET @acme_tid := (SELECT `tenant_id` FROM `tenants` WHERE `tenant_indentifier` = 'acme-hvac' LIMIT 1);

INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @acme_tid, @u_admin, @status_active, @creator_tu, @creator_tu, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_admin
);

SET @tu_admin := (
  SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_admin LIMIT 1
);

INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @acme_tid, @u_dispatch, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_dispatch
);
INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @acme_tid, @u_north, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_north
);
INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @acme_tid, @u_south, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_south
);

SET @tu_dispatch := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_dispatch LIMIT 1);
SET @tu_north := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_north LIMIT 1);
SET @tu_south := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @acme_tid AND `user_id` = @u_south LIMIT 1);

INSERT INTO `tenant_user_roles` (`tenant_user_id`, `role_id`, `created_by`, `created_at`)
SELECT @tu_admin, @role_admin, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_user_roles` WHERE `tenant_user_id` = @tu_admin AND `role_id` = @role_admin);
INSERT INTO `tenant_user_roles` (`tenant_user_id`, `role_id`, `created_by`, `created_at`)
SELECT @tu_dispatch, @role_manager, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_user_roles` WHERE `tenant_user_id` = @tu_dispatch AND `role_id` = @role_manager);
INSERT INTO `tenant_user_roles` (`tenant_user_id`, `role_id`, `created_by`, `created_at`)
SELECT @tu_north, @role_member, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_user_roles` WHERE `tenant_user_id` = @tu_north AND `role_id` = @role_member);
INSERT INTO `tenant_user_roles` (`tenant_user_id`, `role_id`, `created_by`, `created_at`)
SELECT @tu_south, @role_member, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_user_roles` WHERE `tenant_user_id` = @tu_south AND `role_id` = @role_member);

INSERT INTO `tenant_configurations` (
  `tenant_id`, `timezone`, `language_id`, `default_currency`, `week_start_day`,
  `date_format`, `time_format`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, 'America/Chicago', @lang_en, 'USD', 'Monday', 'YYYY-MM-DD', '12h', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_configurations` WHERE `tenant_id` = @acme_tid);

INSERT INTO `tenant_teams` (
  `tenant_id`, `team_identifier`, `name`, `description`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, 'acme-hvac-north', 'North Crew', 'North metro install crew', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_teams` WHERE `team_identifier` = 'acme-hvac-north');
INSERT INTO `tenant_teams` (
  `tenant_id`, `team_identifier`, `name`, `description`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, 'acme-hvac-south', 'South Crew', 'South metro install crew', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_teams` WHERE `team_identifier` = 'acme-hvac-south');

SET @team_north := (SELECT `tenant_team_id` FROM `tenant_teams` WHERE `team_identifier` = 'acme-hvac-north' LIMIT 1);
SET @team_south := (SELECT `tenant_team_id` FROM `tenant_teams` WHERE `team_identifier` = 'acme-hvac-south' LIMIT 1);

INSERT INTO `tenant_team_members` (`tenant_team_id`, `tenant_user_id`, `role_id`, `created_at`)
SELECT @team_north, @tu_north, @role_member, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_members` WHERE `tenant_team_id` = @team_north AND `tenant_user_id` = @tu_north);
INSERT INTO `tenant_team_members` (`tenant_team_id`, `tenant_user_id`, `role_id`, `created_at`)
SELECT @team_south, @tu_south, @role_member, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_members` WHERE `tenant_team_id` = @team_south AND `tenant_user_id` = @tu_south);

INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Jordan Reyes', 'Lead installer - North Crew', @tu_north, 'human', @acme_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Jordan Reyes');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Sam Nguyen', 'Lead installer - South Crew', @tu_south, 'human', @acme_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Sam Nguyen');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Van 12', 'Install van', 0, 'equipment', @acme_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Van 12');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Recovery machine', 'Refrigerant recovery unit', 0, 'equipment', @acme_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Recovery machine');

SET @res_north := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Jordan Reyes' LIMIT 1);
SET @res_south := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Sam Nguyen' LIMIT 1);
SET @res_van := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Van 12' LIMIT 1);
SET @res_recovery := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @acme_tid AND `name` = 'Recovery machine' LIMIT 1);

INSERT INTO `resource_meta` (`resource_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @res_north, JSON_OBJECT('license_expiry', '2028-04-01', 'epa_cert_expiry', '2027-11-15', 'epa_cert_number', 'EPA-N-4412'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `resource_meta` WHERE `resource_id` = @res_north);
INSERT INTO `resource_meta` (`resource_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @res_south, JSON_OBJECT('license_expiry', '2027-09-30', 'epa_cert_expiry', '2028-01-12', 'epa_cert_number', 'EPA-S-7781'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `resource_meta` WHERE `resource_id` = @res_south);

INSERT INTO `customers` (`email`, `first_name`, `last_name`, `is_profile_completed`, `password`, `created_at`, `updated_at`)
SELECT 'pat.morgan@homeowner.demo', 'Pat', 'Morgan', 1, @demo_password, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customers` WHERE `email` = 'pat.morgan@homeowner.demo');
INSERT INTO `customers` (`email`, `first_name`, `last_name`, `is_profile_completed`, `password`, `created_at`, `updated_at`)
SELECT 'lee.chen@homeowner.demo', 'Lee', 'Chen', 1, @demo_password, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customers` WHERE `email` = 'lee.chen@homeowner.demo');

SET @c_pat := (SELECT `customer_id` FROM `customers` WHERE `email` = 'pat.morgan@homeowner.demo' LIMIT 1);
SET @c_lee := (SELECT `customer_id` FROM `customers` WHERE `email` = 'lee.chen@homeowner.demo' LIMIT 1);

INSERT INTO `customer_meta` (`customer_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @c_pat, JSON_OBJECT('billing_entity', 'Pat Morgan', 'service_agreement_tier', 'plus'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_meta` WHERE `customer_id` = @c_pat);
INSERT INTO `customer_meta` (`customer_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @c_lee, JSON_OBJECT('billing_entity', 'Lee Chen', 'service_agreement_tier', 'basic'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_meta` WHERE `customer_id` = @c_lee);

INSERT INTO `customer_contact_info` (
  `customer_id`, `secondary_email`, `phone`, `address`, `city`, `state`, `country`, `postal_code`,
  `timezone`, `language_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @c_pat, 'pat.site@homeowner.demo', '555-0101', '14 Maple Ave', 'Austin', 'TX', 'US', '78701',
  'America/Chicago', @lang_en, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info` WHERE `customer_id` = @c_pat);
INSERT INTO `customer_contact_info` (
  `customer_id`, `secondary_email`, `phone`, `address`, `city`, `state`, `country`, `postal_code`,
  `timezone`, `language_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @c_lee, 'lee.site@homeowner.demo', '555-0102', '88 Harbor Rd', 'Austin', 'TX', 'US', '78704',
  'America/Chicago', @lang_en, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info` WHERE `customer_id` = @c_lee);

SET @cc_pat := (SELECT `customer_contact_id` FROM `customer_contact_info` WHERE `customer_id` = @c_pat LIMIT 1);
SET @cc_lee := (SELECT `customer_contact_id` FROM `customer_contact_info` WHERE `customer_id` = @c_lee LIMIT 1);

INSERT INTO `customer_contact_info_meta` (`customer_contact_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @cc_pat, JSON_OBJECT('site_role', 'owner', 'emergency_phone', '555-0199'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info_meta` WHERE `customer_contact_id` = @cc_pat);
INSERT INTO `customer_contact_info_meta` (`customer_contact_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @cc_lee, JSON_OBJECT('site_role', 'owner', 'emergency_phone', '555-0188'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info_meta` WHERE `customer_contact_id` = @cc_lee);

INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Maple Ave split AC', '3-ton split AC replacement', 'ACME-HVAC-001', 0, @acme_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-001');
INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Harbor Rd heat pump', 'Heat pump install with new thermostat', 'ACME-HVAC-002', 0, @acme_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-002');
INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Oak St mini-split', 'Mini-split for converted garage', 'ACME-HVAC-003', 0, @acme_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-003');

SET @p1 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-001' LIMIT 1);
SET @p2 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-002' LIMIT 1);
SET @p3 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'ACME-HVAC-003' LIMIT 1);

INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p1, JSON_OBJECT('job_number', 'JOB-1001', 'site_address', '14 Maple Ave, Austin TX', 'equipment_type', 'split_ac', 'tonnage', 3, 'permit_id', 'AUS-4412', 'warranty_start', '2026-09-01'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p1);
INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p2, JSON_OBJECT('job_number', 'JOB-1002', 'site_address', '88 Harbor Rd, Austin TX', 'equipment_type', 'heat_pump', 'tonnage', 2.5, 'permit_id', 'AUS-5521', 'warranty_start', ''), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p2);
INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p3, JSON_OBJECT('job_number', 'JOB-1003', 'site_address', '9 Oak St, Austin TX', 'equipment_type', 'mini_split', 'tonnage', 1.5, 'permit_id', '', 'warranty_start', ''), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p3);

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @acme_tid, @p1, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @acme_tid, @p1, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @acme_tid, @p1, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @acme_tid, @p1, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @acme_tid, @p1, 5, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Done');

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @acme_tid, @p2, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @acme_tid, @p2, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @acme_tid, @p2, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @acme_tid, @p2, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @acme_tid, @p2, 5, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Done');

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @acme_tid, @p3, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @acme_tid, @p3, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @acme_tid, @p3, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @acme_tid, @p3, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @acme_tid, @p3, 5, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'Done');

INSERT INTO `tenant_team_projects` (`tenant_team_id`, `project_id`, `created_by`, `created_at`)
SELECT @team_north, @p1, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_projects` WHERE `tenant_team_id` = @team_north AND `project_id` = @p1);
INSERT INTO `tenant_team_projects` (`tenant_team_id`, `project_id`, `created_by`, `created_at`)
SELECT @team_south, @p2, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_projects` WHERE `tenant_team_id` = @team_south AND `project_id` = @p2);
INSERT INTO `tenant_team_projects` (`tenant_team_id`, `project_id`, `created_by`, `created_at`)
SELECT @team_north, @p3, @tu_admin, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_projects` WHERE `tenant_team_id` = @team_north AND `project_id` = @p3);

INSERT INTO `customer_project_members` (`project_id`, `customer_id`, `role_id`, `joined_at`)
SELECT @p1, @c_pat, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p1 AND `customer_id` = @c_pat);
INSERT INTO `customer_project_members` (`project_id`, `customer_id`, `role_id`, `joined_at`)
SELECT @p2, @c_lee, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p2 AND `customer_id` = @c_lee);
INSERT INTO `customer_project_members` (`project_id`, `customer_id`, `role_id`, `joined_at`)
SELECT @p3, @c_pat, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p3 AND `customer_id` = @c_pat);

SET @p1_todo := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'To Do' LIMIT 1);
SET @p1_ready := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Ready' LIMIT 1);
SET @p1_wip := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'In Progress' LIMIT 1);
SET @p2_todo := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'To Do' LIMIT 1);
SET @p2_ready := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Ready' LIMIT 1);
SET @p3_todo := (SELECT `project_task_status_id` FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'To Do' LIMIT 1);

INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p1, @acme_tid, 'WO-ACME-001-A', 'Set indoor unit', 'Mount air handler and line set', @p1_wip,
  'high', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-001-A');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p1, @acme_tid, 'WO-ACME-001-B', 'Startup and charge', 'Vacuum, charge, and startup', @p1_ready,
  'medium', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-001-B');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p2, @acme_tid, 'WO-ACME-002-A', 'Set heat pump', 'Pad, disconnect, and outdoor unit', @p2_ready,
  'high', 'manual', @tu_south, @team_south, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-002-A');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p2, @acme_tid, 'WO-ACME-002-B', 'Thermostat commission', 'Program and walkthrough', @p2_todo,
  'medium', 'manual', @tu_south, @team_south, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-002-B');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p3, @acme_tid, 'WO-ACME-003-A', 'Mini-split rough-in', 'Line set and indoor head', @p3_todo,
  'medium', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-003-A');

SET @t1a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-001-A' LIMIT 1);
SET @t1b := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-001-B' LIMIT 1);
SET @t2a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-002-A' LIMIT 1);
SET @t2b := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-002-B' LIMIT 1);
SET @t3a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-ACME-003-A' LIMIT 1);

INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t1a, JSON_OBJECT('work_order_id', 'WO-ACME-001-A', 'install_phase', 'set', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t1a);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t1b, JSON_OBJECT('work_order_id', 'WO-ACME-001-B', 'install_phase', 'startup', 'refrigerant_charge', 'R-410A', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t1b);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t2a, JSON_OBJECT('work_order_id', 'WO-ACME-002-A', 'install_phase', 'set', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t2a);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t2b, JSON_OBJECT('work_order_id', 'WO-ACME-002-B', 'install_phase', 'commission', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t2b);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t3a, JSON_OBJECT('work_order_id', 'WO-ACME-003-A', 'install_phase', 'rough_in', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t3a);

INSERT INTO `scheduled_tasks` (
  `tenant_id`, `tenant_user_id`, `task_id`, `task_status_id`,
  `requested_start_utc`, `requested_end_utc`, `effective_start_utc`, `effective_end_utc`,
  `status`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, @tu_north, @t1a, @p1_wip,
  '2026-08-18 13:00:00.000000', '2026-08-18 17:00:00.000000',
  '2026-08-18 13:00:00.000000', '2026-08-18 17:00:00.000000',
  'scheduled', 1, @tu_dispatch, @tu_dispatch, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `scheduled_tasks` WHERE `task_id` = @t1a AND `parent_scheduled_task_id` IS NULL AND `is_active` = 1
);
INSERT INTO `scheduled_tasks` (
  `tenant_id`, `tenant_user_id`, `task_id`, `task_status_id`,
  `requested_start_utc`, `requested_end_utc`, `effective_start_utc`, `effective_end_utc`,
  `status`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, @tu_south, @t2a, @p2_ready,
  '2026-08-19 14:00:00.000000', '2026-08-19 18:00:00.000000',
  '2026-08-19 14:00:00.000000', '2026-08-19 18:00:00.000000',
  'scheduled', 1, @tu_dispatch, @tu_dispatch, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `scheduled_tasks` WHERE `task_id` = @t2a AND `parent_scheduled_task_id` IS NULL AND `is_active` = 1
);

-- Per-user configuration / hours / off days (Object Runner Tenant users pack)
INSERT INTO `tenant_user_configurations` (
  `tenant_user_id`, `timezone`, `language_id`, `default_currency`, `week_start_day`,
  `date_format`, `time_format`, `notification_preferences`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT tu.`tenant_user_id`, 'America/Chicago', @lang_en, 'USD', 'monday',
  'YYYY-MM-DD', '12h', 'email',
  @tu_admin, @tu_admin, NOW(6), NOW(6)
FROM `tenant_users` tu
WHERE tu.`tenant_id` = @acme_tid
  AND NOT EXISTS (
    SELECT 1 FROM `tenant_user_configurations` c WHERE c.`tenant_user_id` = tu.`tenant_user_id`
  );

INSERT INTO `tenant_user_working_hours` (
  `tenant_user_id`, `day_of_week`, `start_time`, `end_time`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT tu.`tenant_user_id`, d.day_name, '09:00:00', '17:00:00',
  @tu_admin, @tu_admin, NOW(6), NOW(6)
FROM `tenant_users` tu
CROSS JOIN (
  SELECT 'monday' AS day_name UNION ALL SELECT 'tuesday' UNION ALL SELECT 'wednesday'
  UNION ALL SELECT 'thursday' UNION ALL SELECT 'friday'
) d
WHERE tu.`tenant_id` = @acme_tid
  AND NOT EXISTS (
    SELECT 1 FROM `tenant_user_working_hours` h
    WHERE h.`tenant_user_id` = tu.`tenant_user_id` AND h.`day_of_week` = d.day_name
  );

INSERT INTO `tenant_user_off_days` (
  `tenant_user_id`, `off_date`, `description`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT tu.`tenant_user_id`, '2026-12-25', 'Christmas Day',
  @tu_admin, @tu_admin, NOW(6), NOW(6)
FROM `tenant_users` tu
WHERE tu.`tenant_id` = @acme_tid
  AND NOT EXISTS (
    SELECT 1 FROM `tenant_user_off_days` o
    WHERE o.`tenant_user_id` = tu.`tenant_user_id` AND o.`off_date` = '2026-12-25'
  );

-- Standalone custom instances (Object Designer / Object Runner Instances panel)
SET @hvac_ts := (
  SELECT `config_template_set_id` FROM `config_template_sets`
  WHERE `tenant_id` IS NULL AND `key` = 'industry_hvac_install' LIMIT 1
);
SET @hvac_survey_obj := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @hvac_ts AND `object_type` = 'hvac_site_survey' LIMIT 1
);
SET @hvac_checklist_obj := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @hvac_ts AND `object_type` = 'hvac_install_checklist' LIMIT 1
);
SET @hvac_reg_obj := (
  SELECT `config_object_id` FROM `config_objects`
  WHERE `config_template_set_id` = @hvac_ts AND `object_type` = 'hvac_tenant_registration' LIMIT 1
);

INSERT INTO `config_custom_object_instances` (
  `tenant_id`, `config_object_id`, `payload`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, @hvac_survey_obj,
  JSON_OBJECT(
    'sq_ft', 2400,
    'existing_system_type', 'split_ac',
    'duct_condition', 'fair',
    'electrical_panel_amps', 200,
    'recommended_tonnage', 3.5,
    'survey_notes', 'Acme demo site survey for Oak Street install'
  ),
  'PUBLISHED', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE @hvac_survey_obj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `config_custom_object_instances`
    WHERE `tenant_id` = @acme_tid AND `config_object_id` = @hvac_survey_obj
      AND JSON_UNQUOTE(JSON_EXTRACT(`payload`, '$.survey_notes')) LIKE 'Acme demo site survey%'
  );

INSERT INTO `config_custom_object_instances` (
  `tenant_id`, `config_object_id`, `payload`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, @hvac_checklist_obj,
  JSON_OBJECT(
    'refrigerant_leak_test', TRUE,
    'static_pressure_ok', TRUE,
    'thermostat_commissioned', FALSE,
    'customer_walkthrough_done', FALSE,
    'photos_attached', TRUE
  ),
  'DRAFT', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE @hvac_checklist_obj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `config_custom_object_instances`
    WHERE `tenant_id` = @acme_tid AND `config_object_id` = @hvac_checklist_obj
      AND `status` = 'DRAFT'
  );

INSERT INTO `config_custom_object_instances` (
  `tenant_id`, `config_object_id`, `payload`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @acme_tid, @hvac_reg_obj,
  JSON_OBJECT(
    'company_name', 'Acme HVAC',
    'tenant_identifier', 'acme-hvac',
    'admin_email', 'hvac.admin@acmehvac.demo',
    'admin_username', 'hvac.admin',
    'admin_first_name', 'Avery',
    'admin_last_name', 'Cole'
  ),
  'PUBLISHED', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE @hvac_reg_obj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `config_custom_object_instances`
    WHERE `tenant_id` = @acme_tid AND `config_object_id` = @hvac_reg_obj
      AND JSON_UNQUOTE(JSON_EXTRACT(`payload`, '$.tenant_identifier')) = 'acme-hvac'
  );

SET FOREIGN_KEY_CHECKS = 1;
