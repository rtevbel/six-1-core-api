--
-- Week 4 QA demo: QA Planner Requirement → QA Forked Draft
-- Horizon 1 Sep–31 Oct 2026 · Harbor Rd heat pump · 2× To schedule · no conflicts
--
-- Prerequisites (Acme HVAC SoR on the SAME database you are seeding):
--   db/seed_industry_hvac_install.sql
--   db/seed_industry_hvac_install_demo_data.sql
--   Scheduler migrations 0068+ (requirements / scenarios / planned tasks)
--
-- Staging: Acme HVAC is tenant_id = 32. Pin it below so local vs staging
-- ids cannot silently diverge.
--
-- Apply on staging MySQL:
--   mysql … < db/seed_planner_qa_forked_draft.sql
--
-- Then open the printed planner_url (new requirementId / scenarioId).
-- Do NOT reuse ?requirementId=5&scenarioId=38 — that is Ali demo3.
--
-- Expected KPIs (week scale, both boards):
--   Capacity 0% · To schedule 2 · Needs attention 0 · Critical path 0
--

-- Staging Acme HVAC. Change only if seeding a different env.
SET @target_tenant_id := 32;

SET @acme_tid := (
  SELECT `tenant_id` FROM `tenants`
  WHERE `tenant_id` = @target_tenant_id
    AND `tenant_indentifier` = 'acme-hvac'
  LIMIT 1
);

-- Diagnostic if pin fails (wrong DB / HVAC pack not on tenant 32)
SELECT
  t.`tenant_id`,
  t.`name`,
  t.`tenant_indentifier`,
  CASE
    WHEN t.`tenant_id` IS NULL THEN 'FAIL: no tenant_id=32'
    WHEN t.`tenant_indentifier` <> 'acme-hvac' THEN 'FAIL: tenant 32 is not acme-hvac'
    ELSE 'ok'
  END AS tenant_check
FROM (SELECT @target_tenant_id AS want) w
LEFT JOIN `tenants` t ON t.`tenant_id` = w.want;

SET @tu_admin := (
  SELECT tu.`tenant_user_id`
  FROM `tenant_users` tu
  INNER JOIN `users` u ON u.`user_id` = tu.`user_id`
  WHERE tu.`tenant_id` = @target_tenant_id
    AND u.`email` = 'hvac.admin@acmehvac.demo'
  LIMIT 1
);
SET @p_harbor := (
  SELECT `project_id` FROM `projects`
  WHERE `tenant_id` = @target_tenant_id
    AND (
      `project_indentifier` = 'ACME-HVAC-002'
      OR `name` = 'Harbor Rd heat pump'
    )
  ORDER BY CASE WHEN `project_indentifier` = 'ACME-HVAC-002' THEN 0 ELSE 1 END
  LIMIT 1
);
SET @t_set_hp := (
  SELECT `task_id` FROM `tasks`
  WHERE `tenant_id` = @target_tenant_id
    AND `project_id` = @p_harbor
    AND (
      `task_indentifier` = 'WO-ACME-002-A'
      OR `name` = 'Set heat pump'
    )
  ORDER BY CASE WHEN `task_indentifier` = 'WO-ACME-002-A' THEN 0 ELSE 1 END
  LIMIT 1
);
SET @t_thermo := (
  SELECT `task_id` FROM `tasks`
  WHERE `tenant_id` = @target_tenant_id
    AND `project_id` = @p_harbor
    AND (
      `task_indentifier` = 'WO-ACME-002-B'
      OR `name` = 'Thermostat commission'
    )
  ORDER BY CASE WHEN `task_indentifier` = 'WO-ACME-002-B' THEN 0 ELSE 1 END
  LIMIT 1
);

-- Show SoR state under tenant 32 (empty rows = HVAC demo seed missing on staging)
SELECT 'projects_on_tenant_32' AS section, p.`project_id`, p.`project_indentifier`, p.`name`
FROM `projects` p
WHERE p.`tenant_id` = @target_tenant_id
ORDER BY p.`project_id`
LIMIT 20;

SELECT 'harbor_tasks' AS section, t.`task_id`, t.`task_indentifier`, t.`name`, t.`project_id`
FROM `tasks` t
WHERE t.`tenant_id` = @target_tenant_id
  AND t.`project_id` = @p_harbor
ORDER BY t.`task_id`;

-- Abort hard if HVAC SoR is missing (previous version only printed a warning)
SET @preflight_msg := CASE
  WHEN @acme_tid IS NULL THEN CONCAT(
    'MISSING acme-hvac at tenant_id=', @target_tenant_id,
    ' — confirm you are on staging DB and HVAC demo seed ran for tenant 32'
  )
  WHEN @tu_admin IS NULL THEN 'MISSING hvac.admin@acmehvac.demo tenant user on tenant 32'
  WHEN @p_harbor IS NULL THEN 'MISSING Harbor Rd project on tenant 32 — run db/seed_industry_hvac_install_demo_data.sql on staging'
  WHEN @t_set_hp IS NULL THEN 'MISSING task Set heat pump on tenant 32 Harbor Rd project'
  WHEN @t_thermo IS NULL THEN 'MISSING task Thermostat commission on tenant 32 Harbor Rd project'
  ELSE NULL
END;

SELECT IFNULL(@preflight_msg, 'ok') AS preflight;

-- MySQL 8+: raise error so the script stops instead of inserting nothing
SET @signal_sql := IF(
  @preflight_msg IS NULL,
  'SELECT ''preflight ok'' AS status',
  CONCAT('SIGNAL SQLSTATE ''45000'' SET MESSAGE_TEXT = ', QUOTE(@preflight_msg))
);
PREPARE preflight_stmt FROM @signal_sql;
EXECUTE preflight_stmt;
DEALLOCATE PREPARE preflight_stmt;

-- Use pinned staging tenant everywhere below
SET @acme_tid := @target_tenant_id;

SET @promote_policy := JSON_OBJECT(
  'promoteFrom', 'definitive_only',
  'inFlight', 'block',
  'scope', 'horizon_and_members_only',
  'outsideScopeLive', 'leave_untouched',
  'allowHardConflictOverride', FALSE,
  'archiveOtherDraftsOnPromote', FALSE,
  'includeTerminal', FALSE
);

-- ---------------------------------------------------------------------------
-- Requirement: QA Planner Requirement (project scope = Harbor Rd)
-- ---------------------------------------------------------------------------
INSERT INTO `scheduling_requirements` (
  `tenant_id`, `requirement_key`, `name`, `description`,
  `scope_type`, `primary_project_id`,
  `horizon_start_utc`, `horizon_end_utc`,
  `status`, `active_scenario_id`, `definitive_scenario_id`,
  `promote_policy`, `created_by`, `created_at`, `updated_at`
)
SELECT
  @acme_tid,
  'qa-planner-requirement',
  'QA Planner Requirement',
  'Week 4 read-only Planner demo: Harbor Rd heat pump, Sep–Oct 2026',
  'project',
  @p_harbor,
  '2026-09-01 00:00:00.000000',
  '2026-10-31 23:59:59.000000',
  'open',
  NULL,
  NULL,
  @promote_policy,
  @tu_admin,
  NOW(6),
  NOW(6)
WHERE @acme_tid IS NOT NULL
  AND @p_harbor IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `scheduling_requirements`
    WHERE `tenant_id` = @acme_tid AND `requirement_key` = 'qa-planner-requirement'
  );

SET @req_id := (
  SELECT `scheduling_requirement_id` FROM `scheduling_requirements`
  WHERE `tenant_id` = @acme_tid AND `requirement_key` = 'qa-planner-requirement'
  LIMIT 1
);

-- Keep horizon / primary project aligned if re-run after manual edits
UPDATE `scheduling_requirements`
SET
  `name` = 'QA Planner Requirement',
  `description` = 'Week 4 read-only Planner demo: Harbor Rd heat pump, Sep–Oct 2026',
  `scope_type` = 'project',
  `primary_project_id` = @p_harbor,
  `horizon_start_utc` = '2026-09-01 00:00:00.000000',
  `horizon_end_utc` = '2026-10-31 23:59:59.000000',
  `status` = 'open',
  `promote_policy` = @promote_policy,
  `updated_at` = NOW(6)
WHERE `scheduling_requirement_id` = @req_id;

-- ---------------------------------------------------------------------------
-- Parent scenario (fork source) + QA Forked Draft
-- ---------------------------------------------------------------------------
INSERT INTO `schedule_scenarios` (
  `scheduling_requirement_id`, `tenant_id`, `name`, `notes`,
  `status`, `parent_scenario_id`, `revision`,
  `created_by`, `created_at`, `updated_at`
)
SELECT
  @req_id, @acme_tid, 'QA Base', 'Parent for QA Forked Draft',
  'archived', NULL, 1,
  @tu_admin, NOW(6), NOW(6)
WHERE @req_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `schedule_scenarios`
    WHERE `scheduling_requirement_id` = @req_id AND `name` = 'QA Base'
  );

SET @parent_scenario_id := (
  SELECT `schedule_scenario_id` FROM `schedule_scenarios`
  WHERE `scheduling_requirement_id` = @req_id AND `name` = 'QA Base'
  LIMIT 1
);

INSERT INTO `schedule_scenarios` (
  `scheduling_requirement_id`, `tenant_id`, `name`, `notes`,
  `status`, `parent_scenario_id`, `revision`,
  `created_by`, `created_at`, `updated_at`
)
SELECT
  @req_id, @acme_tid, 'QA Forked Draft',
  'Week 4 client demo — view-only dual boards + KPIs',
  'draft', @parent_scenario_id, 1,
  @tu_admin, NOW(6), NOW(6)
WHERE @req_id IS NOT NULL
  AND @parent_scenario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `schedule_scenarios`
    WHERE `scheduling_requirement_id` = @req_id AND `name` = 'QA Forked Draft'
  );

SET @fork_scenario_id := (
  SELECT `schedule_scenario_id` FROM `schedule_scenarios`
  WHERE `scheduling_requirement_id` = @req_id AND `name` = 'QA Forked Draft'
  LIMIT 1
);

UPDATE `schedule_scenarios`
SET
  `parent_scenario_id` = @parent_scenario_id,
  `status` = 'draft',
  `notes` = 'Week 4 client demo — view-only dual boards + KPIs',
  `updated_at` = NOW(6)
WHERE `schedule_scenario_id` = @fork_scenario_id;

-- Point requirement active scenario at the forked draft
UPDATE `scheduling_requirements`
SET
  `active_scenario_id` = @fork_scenario_id,
  `updated_at` = NOW(6)
WHERE `scheduling_requirement_id` = @req_id;

-- ---------------------------------------------------------------------------
-- Overlay: two Harbor Rd tasks, dates in window, NOT planned, NO assignees
-- → To schedule 2, Needs attention 0 (UNASSIGNED only fires when is_planned=1),
--   Capacity 0%, Critical path 0 (no deps seeded)
-- ---------------------------------------------------------------------------
INSERT INTO `scenario_planned_tasks` (
  `schedule_scenario_id`, `task_id`,
  `planned_start_utc`, `planned_end_utc`, `tz_used`,
  `priority`, `task_status_id`, `notes`,
  `is_planned`, `is_ready`, `is_milestone`, `planning_kind`
)
SELECT
  @fork_scenario_id, @t_set_hp,
  '2026-09-15 13:00:00.000000', '2026-09-15 17:00:00.000000', 'America/Chicago',
  0, NULL, 'QA: unplanned — Set heat pump',
  0, 0, 0, 'task'
WHERE @fork_scenario_id IS NOT NULL AND @t_set_hp IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `scenario_planned_tasks`
    WHERE `schedule_scenario_id` = @fork_scenario_id AND `task_id` = @t_set_hp
  );

INSERT INTO `scenario_planned_tasks` (
  `schedule_scenario_id`, `task_id`,
  `planned_start_utc`, `planned_end_utc`, `tz_used`,
  `priority`, `task_status_id`, `notes`,
  `is_planned`, `is_ready`, `is_milestone`, `planning_kind`
)
SELECT
  @fork_scenario_id, @t_thermo,
  '2026-09-16 13:00:00.000000', '2026-09-16 16:00:00.000000', 'America/Chicago',
  0, NULL, 'QA: unplanned — Thermostat commission',
  0, 0, 0, 'task'
WHERE @fork_scenario_id IS NOT NULL AND @t_thermo IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `scenario_planned_tasks`
    WHERE `schedule_scenario_id` = @fork_scenario_id AND `task_id` = @t_thermo
  );

-- Re-assert unplanned + no-shift state on re-run
UPDATE `scenario_planned_tasks`
SET
  `planned_start_utc` = '2026-09-15 13:00:00.000000',
  `planned_end_utc` = '2026-09-15 17:00:00.000000',
  `is_planned` = 0,
  `is_ready` = 0,
  `is_milestone` = 0,
  `planning_kind` = 'task',
  `notes` = 'QA: unplanned — Set heat pump'
WHERE `schedule_scenario_id` = @fork_scenario_id AND `task_id` = @t_set_hp;

UPDATE `scenario_planned_tasks`
SET
  `planned_start_utc` = '2026-09-16 13:00:00.000000',
  `planned_end_utc` = '2026-09-16 16:00:00.000000',
  `is_planned` = 0,
  `is_ready` = 0,
  `is_milestone` = 0,
  `planning_kind` = 'task',
  `notes` = 'QA: unplanned — Thermostat commission'
WHERE `schedule_scenario_id` = @fork_scenario_id AND `task_id` = @t_thermo;

-- Ensure no assignees (shifts would inflate Capacity / Needs attention)
DELETE sps FROM `scenario_planned_shifts` sps
INNER JOIN `scenario_planned_tasks` spt
  ON spt.`scenario_planned_task_id` = sps.`scenario_planned_task_id`
WHERE spt.`schedule_scenario_id` = @fork_scenario_id
  AND spt.`task_id` IN (@t_set_hp, @t_thermo);

DELETE sra FROM `scenario_resource_assignments` sra
INNER JOIN `scenario_planned_tasks` spt
  ON spt.`scenario_planned_task_id` = sra.`scenario_planned_task_id`
WHERE spt.`schedule_scenario_id` = @fork_scenario_id
  AND spt.`task_id` IN (@t_set_hp, @t_thermo);

-- No critical-path edges between these two Harbor Rd tasks
DELETE FROM `task_dependencies`
WHERE (`task_id` IN (@t_set_hp, @t_thermo) OR `depends_on_task_id` IN (@t_set_hp, @t_thermo));

-- Audit: created + forked (idempotent-ish — skip if already logged)
INSERT INTO `schedule_scenario_events` (
  `schedule_scenario_id`, `scheduling_requirement_id`, `actor_user_id`,
  `kind`, `payload`, `created_at`
)
SELECT @parent_scenario_id, @req_id, @tu_admin, 'created',
  JSON_OBJECT('seed', 'qa-planner-week4'), NOW(6)
WHERE @parent_scenario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `schedule_scenario_events`
    WHERE `schedule_scenario_id` = @parent_scenario_id AND `kind` = 'created'
  );

INSERT INTO `schedule_scenario_events` (
  `schedule_scenario_id`, `scheduling_requirement_id`, `actor_user_id`,
  `kind`, `payload`, `created_at`
)
SELECT @fork_scenario_id, @req_id, @tu_admin, 'forked',
  JSON_OBJECT('parentScenarioId', @parent_scenario_id, 'seed', 'qa-planner-week4'), NOW(6)
WHERE @fork_scenario_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `schedule_scenario_events`
    WHERE `schedule_scenario_id` = @fork_scenario_id AND `kind` = 'forked'
  );

-- ---------------------------------------------------------------------------
-- Print IDs for the staging Planner URL
-- ---------------------------------------------------------------------------
SELECT
  @acme_tid AS tenant_id,
  @req_id AS requirement_id,
  @fork_scenario_id AS scenario_id,
  CONCAT(
    'https://dynerto.guoah.com/planner?requirementId=',
    @req_id,
    '&scenarioId=',
    @fork_scenario_id,
    '&view=both'
  ) AS planner_url;
