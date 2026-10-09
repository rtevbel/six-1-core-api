--
-- Nordic Cool operational demo data (HVAC pack clone of Acme HVAC).
-- Full sample ops data + standalone survey/checklist/registration instances.
--
-- Prerequisites: same as Acme — lookups/roles; seed_industry_hvac_install.sql; migrations; platform packs.
-- Demo login: nordic.admin@nordiccool.demo / DemonordicPass123!
--

SET FOREIGN_KEY_CHECKS = 0;

SET @demo_password := '$2b$10$6.0zBHFgG6TNTCnRhHwD5uIqtU60l3Ss49XTYqhrtlv0UReB2mhMS';
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
SELECT 'nordic.admin@nordiccool.demo', 'nordic.admin', 'Freja', 'Holm', @demo_password, 1, 'Freja Holm', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'nordic.admin@nordiccool.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'nordic.dispatch@nordiccool.demo', 'nordic.dispatch', 'Lars', 'Ek', @demo_password, 1, 'Lars Ek', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'nordic.dispatch@nordiccool.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'nordic.north@nordiccool.demo', 'nordic.north', 'Erik', 'Lind', @demo_password, 1, 'Erik Lind', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'nordic.north@nordiccool.demo');

INSERT INTO `users` (
  `email`, `username`, `first_name`, `last_name`, `password`, `status`, `display_name`, `created_at`, `updated_at`
)
SELECT 'nordic.south@nordiccool.demo', 'nordic.south', 'Maja', 'Berg', @demo_password, 1, 'Maja Berg', NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `email` = 'nordic.south@nordiccool.demo');

SET @u_admin := (SELECT `user_id` FROM `users` WHERE `email` = 'nordic.admin@nordiccool.demo' LIMIT 1);
SET @u_dispatch := (SELECT `user_id` FROM `users` WHERE `email` = 'nordic.dispatch@nordiccool.demo' LIMIT 1);
SET @u_north := (SELECT `user_id` FROM `users` WHERE `email` = 'nordic.north@nordiccool.demo' LIMIT 1);
SET @u_south := (SELECT `user_id` FROM `users` WHERE `email` = 'nordic.south@nordiccool.demo' LIMIT 1);

INSERT INTO `user_roles` (`user_id`, `role_id`, `created_by`, `created_at`)
SELECT @u_admin, @role_admin, @u_admin, NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `user_roles` WHERE `user_id` = @u_admin AND `role_id` = @role_admin
);

INSERT INTO `tenants` (
  `name`, `tenant_type_id`, `tenant_indentifier`, `user_id`, `status_id`, `created_at`, `updated_at`
)
SELECT 'Nordic Cool', @tenant_type_company, 'nordic-cool', @u_admin, @status_active, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenants` WHERE `tenant_indentifier` = 'nordic-cool');

SET @nordic_tid := (SELECT `tenant_id` FROM `tenants` WHERE `tenant_indentifier` = 'nordic-cool' LIMIT 1);

INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @nordic_tid, @u_admin, @status_active, @creator_tu, @creator_tu, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_admin
);

SET @tu_admin := (
  SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_admin LIMIT 1
);

INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @nordic_tid, @u_dispatch, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_dispatch
);
INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @nordic_tid, @u_north, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_north
);
INSERT INTO `tenant_users` (`tenant_id`, `user_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`)
SELECT @nordic_tid, @u_south, @status_active, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (
  SELECT 1 FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_south
);

SET @tu_dispatch := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_dispatch LIMIT 1);
SET @tu_north := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_north LIMIT 1);
SET @tu_south := (SELECT `tenant_user_id` FROM `tenant_users` WHERE `tenant_id` = @nordic_tid AND `user_id` = @u_south LIMIT 1);

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
SELECT @nordic_tid, 'Europe/Stockholm', @lang_en, 'EUR', 'Monday', 'YYYY-MM-DD', '12h', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_configurations` WHERE `tenant_id` = @nordic_tid);

INSERT INTO `tenant_teams` (
  `tenant_id`, `team_identifier`, `name`, `description`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @nordic_tid, 'nordic-cool-north', 'North Crew', 'North metro install crew', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_teams` WHERE `team_identifier` = 'nordic-cool-north');
INSERT INTO `tenant_teams` (
  `tenant_id`, `team_identifier`, `name`, `description`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @nordic_tid, 'nordic-cool-south', 'South Crew', 'South metro install crew', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_teams` WHERE `team_identifier` = 'nordic-cool-south');

SET @team_north := (SELECT `tenant_team_id` FROM `tenant_teams` WHERE `team_identifier` = 'nordic-cool-north' LIMIT 1);
SET @team_south := (SELECT `tenant_team_id` FROM `tenant_teams` WHERE `team_identifier` = 'nordic-cool-south' LIMIT 1);

INSERT INTO `tenant_team_members` (`tenant_team_id`, `tenant_user_id`, `role_id`, `created_at`)
SELECT @team_north, @tu_north, @role_member, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_members` WHERE `tenant_team_id` = @team_north AND `tenant_user_id` = @tu_north);
INSERT INTO `tenant_team_members` (`tenant_team_id`, `tenant_user_id`, `role_id`, `created_at`)
SELECT @team_south, @tu_south, @role_member, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tenant_team_members` WHERE `tenant_team_id` = @team_south AND `tenant_user_id` = @tu_south);

INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Erik Lind', 'Lead installer - North Crew', @tu_north, 'human', @nordic_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Erik Lind');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Maja Berg', 'Lead installer - South Crew', @tu_south, 'human', @nordic_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Maja Berg');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Van 12', 'Install van', 0, 'equipment', @nordic_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Van 12');
INSERT INTO `resources` (`name`, `description`, `tenant_user_id`, `type`, `tenant_id`, `is_shared`, `created_at`)
SELECT 'Recovery machine', 'Refrigerant recovery unit', 0, 'equipment', @nordic_tid, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Recovery machine');

SET @res_north := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Erik Lind' LIMIT 1);
SET @res_south := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Maja Berg' LIMIT 1);
SET @res_van := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Van 12' LIMIT 1);
SET @res_recovery := (SELECT `resource_id` FROM `resources` WHERE `tenant_id` = @nordic_tid AND `name` = 'Recovery machine' LIMIT 1);

INSERT INTO `resource_meta` (`resource_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @res_north, JSON_OBJECT('license_expiry', '2028-04-01', 'epa_cert_expiry', '2027-11-15', 'epa_cert_number', 'EPA-NORDIC-N-4412'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `resource_meta` WHERE `resource_id` = @res_north);
INSERT INTO `resource_meta` (`resource_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @res_south, JSON_OBJECT('license_expiry', '2027-09-30', 'epa_cert_expiry', '2028-01-12', 'epa_cert_number', 'EPA-NORDIC-S-7781'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `resource_meta` WHERE `resource_id` = @res_south);

INSERT INTO `customers` (`email`, `first_name`, `last_name`, `is_profile_completed`, `password`, `created_at`, `updated_at`)
SELECT 'karl.andersson@homeowner.nordic.demo', 'Karl', 'Andersson', 1, @demo_password, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customers` WHERE `email` = 'karl.andersson@homeowner.nordic.demo');
INSERT INTO `customers` (`email`, `first_name`, `last_name`, `is_profile_completed`, `password`, `created_at`, `updated_at`)
SELECT 'ingrid.nilsson@homeowner.nordic.demo', 'Ingrid', 'Nilsson', 1, @demo_password, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customers` WHERE `email` = 'ingrid.nilsson@homeowner.nordic.demo');

SET @c_karl := (SELECT `customer_id` FROM `customers` WHERE `email` = 'karl.andersson@homeowner.nordic.demo' LIMIT 1);
SET @c_ingrid := (SELECT `customer_id` FROM `customers` WHERE `email` = 'ingrid.nilsson@homeowner.nordic.demo' LIMIT 1);

INSERT INTO `customer_meta` (`customer_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @c_karl, JSON_OBJECT('billing_entity', 'Karl Andersson', 'service_agreement_tier', 'plus'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_meta` WHERE `customer_id` = @c_karl);
INSERT INTO `customer_meta` (`customer_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @c_ingrid, JSON_OBJECT('billing_entity', 'Ingrid Nilsson', 'service_agreement_tier', 'basic'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_meta` WHERE `customer_id` = @c_ingrid);

INSERT INTO `customer_contact_info` (
  `customer_id`, `secondary_email`, `phone`, `address`, `city`, `state`, `country`, `postal_code`,
  `timezone`, `language_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @c_karl, 'karl.site@homeowner.nordic.demo', '555-0101', '14 Vasagatan', 'Stockholm', 'AB', 'SE', '11120',
  'Europe/Stockholm', @lang_en, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info` WHERE `customer_id` = @c_karl);
INSERT INTO `customer_contact_info` (
  `customer_id`, `secondary_email`, `phone`, `address`, `city`, `state`, `country`, `postal_code`,
  `timezone`, `language_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @c_ingrid, 'ingrid.site@homeowner.nordic.demo', '555-0102', '88 Södermalm', 'Stockholm', 'AB', 'SE', '11846',
  'Europe/Stockholm', @lang_en, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info` WHERE `customer_id` = @c_ingrid);

SET @cc_karl := (SELECT `customer_contact_id` FROM `customer_contact_info` WHERE `customer_id` = @c_karl LIMIT 1);
SET @cc_ingrid := (SELECT `customer_contact_id` FROM `customer_contact_info` WHERE `customer_id` = @c_ingrid LIMIT 1);

INSERT INTO `customer_contact_info_meta` (`customer_contact_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @cc_karl, JSON_OBJECT('site_role', 'owner', 'emergency_phone', '555-0199'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info_meta` WHERE `customer_contact_id` = @cc_karl);
INSERT INTO `customer_contact_info_meta` (`customer_contact_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @cc_ingrid, JSON_OBJECT('site_role', 'owner', 'emergency_phone', '555-0188'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_contact_info_meta` WHERE `customer_contact_id` = @cc_ingrid);

INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Vasagatan split AC', '3-ton split AC replacement', 'NORDIC-COOL-001', 0, @nordic_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-001');
INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Södermalm heat pump', 'Heat pump install with new thermostat', 'NORDIC-COOL-002', 0, @nordic_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-002');
INSERT INTO `projects` (
  `name`, `description`, `project_indentifier`, `parent_project_id`, `tenant_id`,
  `is_shared`, `status`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT 'Kungsgatan mini-split', 'Mini-split for converted garage', 'NORDIC-COOL-003', 0, @nordic_tid,
  0, 'active', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-003');

SET @p1 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-001' LIMIT 1);
SET @p2 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-002' LIMIT 1);
SET @p3 := (SELECT `project_id` FROM `projects` WHERE `project_indentifier` = 'NORDIC-COOL-003' LIMIT 1);

INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p1, JSON_OBJECT('job_number', 'JOB-N-1001', 'site_address', '14 Vasagatan, Stockholm', 'equipment_type', 'split_ac', 'tonnage', 3, 'permit_id', 'STH-4412', 'warranty_start', '2026-09-01'), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p1);
INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p2, JSON_OBJECT('job_number', 'JOB-N-1002', 'site_address', '88 Södermalm, Stockholm', 'equipment_type', 'heat_pump', 'tonnage', 2.5, 'permit_id', 'STH-5521', 'warranty_start', ''), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p2);
INSERT INTO `project_meta` (`project_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @p3, JSON_OBJECT('job_number', 'JOB-N-1003', 'site_address', '9 Kungsgatan, Stockholm', 'equipment_type', 'mini_split', 'tonnage', 1.5, 'permit_id', '', 'warranty_start', ''), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `project_meta` WHERE `project_id` = @p3);

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @nordic_tid, @p1, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @nordic_tid, @p1, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @nordic_tid, @p1, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @nordic_tid, @p1, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @nordic_tid, @p1, 5, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p1 AND `name` = 'Done');

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @nordic_tid, @p2, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @nordic_tid, @p2, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @nordic_tid, @p2, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @nordic_tid, @p2, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @nordic_tid, @p2, 5, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p2 AND `name` = 'Done');

INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'To Do', @nordic_tid, @p3, 1, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'To Do');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Ready', @nordic_tid, @p3, 2, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'Ready');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'In Progress', @nordic_tid, @p3, 3, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'In Progress');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Blocked', @nordic_tid, @p3, 4, @tu_admin, @tu_admin
WHERE NOT EXISTS (SELECT 1 FROM `project_task_statuses` WHERE `project_id` = @p3 AND `name` = 'Blocked');
INSERT INTO `project_task_statuses` (`name`, `tenant_id`, `project_id`, `status_order`, `created_by`, `updated_by`)
SELECT 'Done', @nordic_tid, @p3, 5, @tu_admin, @tu_admin
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
SELECT @p1, @c_karl, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p1 AND `customer_id` = @c_karl);
INSERT INTO `customer_project_members` (`project_id`, `customer_id`, `role_id`, `joined_at`)
SELECT @p2, @c_ingrid, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p2 AND `customer_id` = @c_ingrid);
INSERT INTO `customer_project_members` (`project_id`, `customer_id`, `role_id`, `joined_at`)
SELECT @p3, @c_karl, @role_customer, NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `customer_project_members` WHERE `project_id` = @p3 AND `customer_id` = @c_karl);

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
SELECT @p1, @nordic_tid, 'WO-NORDIC-001-A', 'Set indoor unit', 'Mount air handler and line set', @p1_wip,
  'high', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-001-A');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p1, @nordic_tid, 'WO-NORDIC-001-B', 'Startup and charge', 'Vacuum, charge, and startup', @p1_ready,
  'medium', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-001-B');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p2, @nordic_tid, 'WO-NORDIC-002-A', 'Set heat pump', 'Pad, disconnect, and outdoor unit', @p2_ready,
  'high', 'manual', @tu_south, @team_south, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-002-A');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p2, @nordic_tid, 'WO-NORDIC-002-B', 'Thermostat commission', 'Program and walkthrough', @p2_todo,
  'medium', 'manual', @tu_south, @team_south, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-002-B');
INSERT INTO `tasks` (
  `project_id`, `tenant_id`, `task_indentifier`, `name`, `description`, `task_status_id`,
  `priority`, `status_control`, `primary_assignee_id`, `team_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @p3, @nordic_tid, 'WO-NORDIC-003-A', 'Mini-split rough-in', 'Line set and indoor head', @p3_todo,
  'medium', 'manual', @tu_north, @team_north, @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-003-A');

SET @t1a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-001-A' LIMIT 1);
SET @t1b := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-001-B' LIMIT 1);
SET @t2a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-002-A' LIMIT 1);
SET @t2b := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-002-B' LIMIT 1);
SET @t3a := (SELECT `task_id` FROM `tasks` WHERE `task_indentifier` = 'WO-NORDIC-003-A' LIMIT 1);

INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t1a, JSON_OBJECT('work_order_id', 'WO-NORDIC-001-A', 'install_phase', 'set', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t1a);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t1b, JSON_OBJECT('work_order_id', 'WO-NORDIC-001-B', 'install_phase', 'startup', 'refrigerant_charge', 'R-410A', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t1b);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t2a, JSON_OBJECT('work_order_id', 'WO-NORDIC-002-A', 'install_phase', 'set', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t2a);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t2b, JSON_OBJECT('work_order_id', 'WO-NORDIC-002-B', 'install_phase', 'commission', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t2b);
INSERT INTO `task_meta` (`task_id`, `meta_json`, `created_at`, `updated_at`)
SELECT @t3a, JSON_OBJECT('work_order_id', 'WO-NORDIC-003-A', 'install_phase', 'rough_in', 'refrigerant_charge', '', 'ppe_required', TRUE), NOW(6), NOW(6)
WHERE NOT EXISTS (SELECT 1 FROM `task_meta` WHERE `task_id` = @t3a);

INSERT INTO `scheduled_tasks` (
  `tenant_id`, `tenant_user_id`, `task_id`, `task_status_id`,
  `requested_start_utc`, `requested_end_utc`, `effective_start_utc`, `effective_end_utc`,
  `status`, `is_active`, `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @nordic_tid, @tu_north, @t1a, @p1_wip,
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
SELECT @nordic_tid, @tu_south, @t2a, @p2_ready,
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
SELECT tu.`tenant_user_id`, 'Europe/Stockholm', @lang_en, 'EUR', 'monday',
  'YYYY-MM-DD', '12h', 'email',
  @tu_admin, @tu_admin, NOW(6), NOW(6)
FROM `tenant_users` tu
WHERE tu.`tenant_id` = @nordic_tid
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
WHERE tu.`tenant_id` = @nordic_tid
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
WHERE tu.`tenant_id` = @nordic_tid
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
SELECT @nordic_tid, @hvac_survey_obj,
  JSON_OBJECT(
    'sq_ft', 2400,
    'existing_system_type', 'split_ac',
    'duct_condition', 'fair',
    'electrical_panel_amps', 200,
    'recommended_tonnage', 3.5,
    'survey_notes', 'Nordic Cool demo site survey for Oak Street install'
  ),
  'PUBLISHED', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE @hvac_survey_obj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `config_custom_object_instances`
    WHERE `tenant_id` = @nordic_tid AND `config_object_id` = @hvac_survey_obj
      AND JSON_UNQUOTE(JSON_EXTRACT(`payload`, '$.survey_notes')) LIKE 'Nordic Cool demo site survey%'
  );

INSERT INTO `config_custom_object_instances` (
  `tenant_id`, `config_object_id`, `payload`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @nordic_tid, @hvac_checklist_obj,
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
    WHERE `tenant_id` = @nordic_tid AND `config_object_id` = @hvac_checklist_obj
      AND `status` = 'DRAFT'
  );

INSERT INTO `config_custom_object_instances` (
  `tenant_id`, `config_object_id`, `payload`, `status`,
  `created_by`, `updated_by`, `created_at`, `updated_at`
)
SELECT @nordic_tid, @hvac_reg_obj,
  JSON_OBJECT(
    'company_name', 'Nordic Cool',
    'tenant_identifier', 'nordic-cool',
    'admin_email', 'nordic.admin@nordiccool.demo',
    'admin_username', 'nordic.admin',
    'admin_first_name', 'Avery',
    'admin_last_name', 'Cole'
  ),
  'PUBLISHED', @tu_admin, @tu_admin, NOW(6), NOW(6)
WHERE @hvac_reg_obj IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `config_custom_object_instances`
    WHERE `tenant_id` = @nordic_tid AND `config_object_id` = @hvac_reg_obj
      AND JSON_UNQUOTE(JSON_EXTRACT(`payload`, '$.tenant_identifier')) = 'nordic-cool'
  );

SET FOREIGN_KEY_CHECKS = 1;
