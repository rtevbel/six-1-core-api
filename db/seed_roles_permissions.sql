-- ============================================================================
-- SIX1 Core API - Roles and Permissions Seed Data
-- ============================================================================
-- This file contains seed data for roles and permissions system
-- It includes permissions for all modules and standard role definitions
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- PART 1: PERMISSIONS
-- ============================================================================
-- Insert permissions for all modules with CRUD operations
-- Note: Assumes status_id = 1 (Active), language_id = 1 (English)
-- ============================================================================

-- Users Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 0, NOW(), NOW()),
(2, 1, 1, 0, NOW(), NOW()),
(3, 1, 1, 0, NOW(), NOW()),
(4, 1, 1, 0, NOW(), NOW()),
(5, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'users.create', 'Create new users', 'Users', NOW(), NOW()),
(2, 2, 1, 'users.read', 'View users', 'Users', NOW(), NOW()),
(3, 3, 1, 'users.update', 'Update users', 'Users', NOW(), NOW()),
(4, 4, 1, 'users.delete', 'Delete users', 'Users', NOW(), NOW()),
(5, 5, 1, 'users.manage', 'Full management of users', 'Users', NOW(), NOW());

-- Roles Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(6, 1, 1, 0, NOW(), NOW()),
(7, 1, 1, 0, NOW(), NOW()),
(8, 1, 1, 0, NOW(), NOW()),
(9, 1, 1, 0, NOW(), NOW()),
(10, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(6, 6, 1, 'roles.create', 'Create new roles', 'Roles', NOW(), NOW()),
(7, 7, 1, 'roles.read', 'View roles', 'Roles', NOW(), NOW()),
(8, 8, 1, 'roles.update', 'Update roles', 'Roles', NOW(), NOW()),
(9, 9, 1, 'roles.delete', 'Delete roles', 'Roles', NOW(), NOW()),
(10, 10, 1, 'roles.manage', 'Full management of roles', 'Roles', NOW(), NOW());

-- Permissions Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(11, 1, 1, 0, NOW(), NOW()),
(12, 1, 1, 0, NOW(), NOW()),
(13, 1, 1, 0, NOW(), NOW()),
(14, 1, 1, 0, NOW(), NOW()),
(15, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(11, 11, 1, 'permissions.create', 'Create new permissions', 'Permissions', NOW(), NOW()),
(12, 12, 1, 'permissions.read', 'View permissions', 'Permissions', NOW(), NOW()),
(13, 13, 1, 'permissions.update', 'Update permissions', 'Permissions', NOW(), NOW()),
(14, 14, 1, 'permissions.delete', 'Delete permissions', 'Permissions', NOW(), NOW()),
(15, 15, 1, 'permissions.manage', 'Full management of permissions', 'Permissions', NOW(), NOW());

-- Tenants Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(16, 1, 1, 0, NOW(), NOW()),
(17, 1, 1, 0, NOW(), NOW()),
(18, 1, 1, 0, NOW(), NOW()),
(19, 1, 1, 0, NOW(), NOW()),
(20, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(16, 16, 1, 'tenants.create', 'Create new tenants', 'Tenants', NOW(), NOW()),
(17, 17, 1, 'tenants.read', 'View tenants', 'Tenants', NOW(), NOW()),
(18, 18, 1, 'tenants.update', 'Update tenants', 'Tenants', NOW(), NOW()),
(19, 19, 1, 'tenants.delete', 'Delete tenants', 'Tenants', NOW(), NOW()),
(20, 20, 1, 'tenants.manage', 'Full management of tenants', 'Tenants', NOW(), NOW());

-- Tenant Users Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(21, 1, 1, 0, NOW(), NOW()),
(22, 1, 1, 0, NOW(), NOW()),
(23, 1, 1, 0, NOW(), NOW()),
(24, 1, 1, 0, NOW(), NOW()),
(25, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(21, 21, 1, 'tenant_users.create', 'Create new tenant users', 'Tenant Users', NOW(), NOW()),
(22, 22, 1, 'tenant_users.read', 'View tenant users', 'Tenant Users', NOW(), NOW()),
(23, 23, 1, 'tenant_users.update', 'Update tenant users', 'Tenant Users', NOW(), NOW()),
(24, 24, 1, 'tenant_users.delete', 'Delete tenant users', 'Tenant Users', NOW(), NOW()),
(25, 25, 1, 'tenant_users.manage', 'Full management of tenant users', 'Tenant Users', NOW(), NOW());

-- Tenant Teams Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(26, 1, 1, 0, NOW(), NOW()),
(27, 1, 1, 0, NOW(), NOW()),
(28, 1, 1, 0, NOW(), NOW()),
(29, 1, 1, 0, NOW(), NOW()),
(30, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(26, 26, 1, 'tenant_teams.create', 'Create new tenant teams', 'Tenant Teams', NOW(), NOW()),
(27, 27, 1, 'tenant_teams.read', 'View tenant teams', 'Tenant Teams', NOW(), NOW()),
(28, 28, 1, 'tenant_teams.update', 'Update tenant teams', 'Tenant Teams', NOW(), NOW()),
(29, 29, 1, 'tenant_teams.delete', 'Delete tenant teams', 'Tenant Teams', NOW(), NOW()),
(30, 30, 1, 'tenant_teams.manage', 'Full management of tenant teams', 'Tenant Teams', NOW(), NOW());

-- Projects Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(31, 1, 1, 0, NOW(), NOW()),
(32, 1, 1, 0, NOW(), NOW()),
(33, 1, 1, 0, NOW(), NOW()),
(34, 1, 1, 0, NOW(), NOW()),
(35, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(31, 31, 1, 'projects.create', 'Create new projects', 'Projects', NOW(), NOW()),
(32, 32, 1, 'projects.read', 'View projects', 'Projects', NOW(), NOW()),
(33, 33, 1, 'projects.update', 'Update projects', 'Projects', NOW(), NOW()),
(34, 34, 1, 'projects.delete', 'Delete projects', 'Projects', NOW(), NOW()),
(35, 35, 1, 'projects.manage', 'Full management of projects', 'Projects', NOW(), NOW());

-- Tasks Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(36, 1, 1, 0, NOW(), NOW()),
(37, 1, 1, 0, NOW(), NOW()),
(38, 1, 1, 0, NOW(), NOW()),
(39, 1, 1, 0, NOW(), NOW()),
(40, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(36, 36, 1, 'tasks.create', 'Create new tasks', 'Tasks', NOW(), NOW()),
(37, 37, 1, 'tasks.read', 'View tasks', 'Tasks', NOW(), NOW()),
(38, 38, 1, 'tasks.update', 'Update tasks', 'Tasks', NOW(), NOW()),
(39, 39, 1, 'tasks.delete', 'Delete tasks', 'Tasks', NOW(), NOW()),
(40, 40, 1, 'tasks.manage', 'Full management of tasks', 'Tasks', NOW(), NOW());

-- Process Templates Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(41, 1, 1, 0, NOW(), NOW()),
(42, 1, 1, 0, NOW(), NOW()),
(43, 1, 1, 0, NOW(), NOW()),
(44, 1, 1, 0, NOW(), NOW()),
(45, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(41, 41, 1, 'process_templates.create', 'Create new process templates', 'Process Templates', NOW(), NOW()),
(42, 42, 1, 'process_templates.read', 'View process templates', 'Process Templates', NOW(), NOW()),
(43, 43, 1, 'process_templates.update', 'Update process templates', 'Process Templates', NOW(), NOW()),
(44, 44, 1, 'process_templates.delete', 'Delete process templates', 'Process Templates', NOW(), NOW()),
(45, 45, 1, 'process_templates.manage', 'Full management of process templates', 'Process Templates', NOW(), NOW());

-- Process Instances Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(46, 1, 1, 0, NOW(), NOW()),
(47, 1, 1, 0, NOW(), NOW()),
(48, 1, 1, 0, NOW(), NOW()),
(49, 1, 1, 0, NOW(), NOW()),
(50, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(46, 46, 1, 'process_instances.create', 'Create new process instances', 'Process Instances', NOW(), NOW()),
(47, 47, 1, 'process_instances.read', 'View process instances', 'Process Instances', NOW(), NOW()),
(48, 48, 1, 'process_instances.update', 'Update process instances', 'Process Instances', NOW(), NOW()),
(49, 49, 1, 'process_instances.delete', 'Delete process instances', 'Process Instances', NOW(), NOW()),
(50, 50, 1, 'process_instances.manage', 'Full management of process instances', 'Process Instances', NOW(), NOW());

-- Categories Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(51, 1, 1, 0, NOW(), NOW()),
(52, 1, 1, 0, NOW(), NOW()),
(53, 1, 1, 0, NOW(), NOW()),
(54, 1, 1, 0, NOW(), NOW()),
(55, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(51, 51, 1, 'categories.create', 'Create new categories', 'Categories', NOW(), NOW()),
(52, 52, 1, 'categories.read', 'View categories', 'Categories', NOW(), NOW()),
(53, 53, 1, 'categories.update', 'Update categories', 'Categories', NOW(), NOW()),
(54, 54, 1, 'categories.delete', 'Delete categories', 'Categories', NOW(), NOW()),
(55, 55, 1, 'categories.manage', 'Full management of categories', 'Categories', NOW(), NOW());

-- Customers Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(56, 1, 1, 0, NOW(), NOW()),
(57, 1, 1, 0, NOW(), NOW()),
(58, 1, 1, 0, NOW(), NOW()),
(59, 1, 1, 0, NOW(), NOW()),
(60, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(56, 56, 1, 'customers.create', 'Create new customers', 'Customers', NOW(), NOW()),
(57, 57, 1, 'customers.read', 'View customers', 'Customers', NOW(), NOW()),
(58, 58, 1, 'customers.update', 'Update customers', 'Customers', NOW(), NOW()),
(59, 59, 1, 'customers.delete', 'Delete customers', 'Customers', NOW(), NOW()),
(60, 60, 1, 'customers.manage', 'Full management of customers', 'Customers', NOW(), NOW());

-- Sharing Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(61, 1, 1, 0, NOW(), NOW()),
(62, 1, 1, 0, NOW(), NOW()),
(63, 1, 1, 0, NOW(), NOW()),
(64, 1, 1, 0, NOW(), NOW()),
(65, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(61, 61, 1, 'sharing.create', 'Share resources', 'Sharing', NOW(), NOW()),
(62, 62, 1, 'sharing.read', 'View shared resources', 'Sharing', NOW(), NOW()),
(63, 63, 1, 'sharing.update', 'Update sharing settings', 'Sharing', NOW(), NOW()),
(64, 64, 1, 'sharing.delete', 'Revoke sharing', 'Sharing', NOW(), NOW()),
(65, 65, 1, 'sharing.manage', 'Full management of sharing', 'Sharing', NOW(), NOW());

-- Automation Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(66, 1, 1, 0, NOW(), NOW()),
(67, 1, 1, 0, NOW(), NOW()),
(68, 1, 1, 0, NOW(), NOW()),
(69, 1, 1, 0, NOW(), NOW()),
(70, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(66, 66, 1, 'automation.create', 'Create new automations', 'Automation', NOW(), NOW()),
(67, 67, 1, 'automation.read', 'View automations', 'Automation', NOW(), NOW()),
(68, 68, 1, 'automation.update', 'Update automations', 'Automation', NOW(), NOW()),
(69, 69, 1, 'automation.delete', 'Delete automations', 'Automation', NOW(), NOW()),
(70, 70, 1, 'automation.manage', 'Full management of automations', 'Automation', NOW(), NOW());

-- Scheduler Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(71, 1, 1, 0, NOW(), NOW()),
(72, 1, 1, 0, NOW(), NOW()),
(73, 1, 1, 0, NOW(), NOW()),
(74, 1, 1, 0, NOW(), NOW()),
(75, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(71, 71, 1, 'scheduler.create', 'Create scheduled tasks', 'Scheduler', NOW(), NOW()),
(72, 72, 1, 'scheduler.read', 'View scheduled tasks', 'Scheduler', NOW(), NOW()),
(73, 73, 1, 'scheduler.update', 'Update scheduled tasks', 'Scheduler', NOW(), NOW()),
(74, 74, 1, 'scheduler.delete', 'Delete scheduled tasks', 'Scheduler', NOW(), NOW()),
(75, 75, 1, 'scheduler.manage', 'Full management of scheduler', 'Scheduler', NOW(), NOW());

-- Storage Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(76, 1, 1, 0, NOW(), NOW()),
(77, 1, 1, 0, NOW(), NOW()),
(78, 1, 1, 0, NOW(), NOW()),
(79, 1, 1, 0, NOW(), NOW()),
(80, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(76, 76, 1, 'storage.create', 'Upload files', 'Storage', NOW(), NOW()),
(77, 77, 1, 'storage.read', 'View and download files', 'Storage', NOW(), NOW()),
(78, 78, 1, 'storage.update', 'Update files', 'Storage', NOW(), NOW()),
(79, 79, 1, 'storage.delete', 'Delete files', 'Storage', NOW(), NOW()),
(80, 80, 1, 'storage.manage', 'Full management of storage', 'Storage', NOW(), NOW());

-- Notifications Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(81, 1, 1, 0, NOW(), NOW()),
(82, 1, 1, 0, NOW(), NOW()),
(83, 1, 1, 0, NOW(), NOW()),
(84, 1, 1, 0, NOW(), NOW()),
(85, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(81, 81, 1, 'notifications.create', 'Create notifications', 'Notifications', NOW(), NOW()),
(82, 82, 1, 'notifications.read', 'View notifications', 'Notifications', NOW(), NOW()),
(83, 83, 1, 'notifications.update', 'Update notifications', 'Notifications', NOW(), NOW()),
(84, 84, 1, 'notifications.delete', 'Delete notifications', 'Notifications', NOW(), NOW()),
(85, 85, 1, 'notifications.manage', 'Full management of notifications', 'Notifications', NOW(), NOW());

-- Events Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(86, 1, 1, 0, NOW(), NOW()),
(87, 1, 1, 0, NOW(), NOW()),
(88, 1, 1, 0, NOW(), NOW()),
(89, 1, 1, 0, NOW(), NOW()),
(90, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(86, 86, 1, 'events.create', 'Create events', 'Events', NOW(), NOW()),
(87, 87, 1, 'events.read', 'View events', 'Events', NOW(), NOW()),
(88, 88, 1, 'events.update', 'Update events', 'Events', NOW(), NOW()),
(89, 89, 1, 'events.delete', 'Delete events', 'Events', NOW(), NOW()),
(90, 90, 1, 'events.manage', 'Full management of events', 'Events', NOW(), NOW());

-- Settings Module Permissions
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(91, 1, 1, 0, NOW(), NOW()),
(92, 1, 1, 0, NOW(), NOW()),
(93, 1, 1, 0, NOW(), NOW()),
(94, 1, 1, 0, NOW(), NOW()),
(95, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(91, 91, 1, 'settings.create', 'Create settings', 'Settings', NOW(), NOW()),
(92, 92, 1, 'settings.read', 'View settings', 'Settings', NOW(), NOW()),
(93, 93, 1, 'settings.update', 'Update settings', 'Settings', NOW(), NOW()),
(94, 94, 1, 'settings.delete', 'Delete settings', 'Settings', NOW(), NOW()),
(95, 95, 1, 'settings.manage', 'Full management of settings', 'Settings', NOW(), NOW());

-- Reports Module Permissions (if exists)
INSERT INTO `permissions` (`permission_id`, `status_id`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(96, 1, 1, 0, NOW(), NOW()),
(97, 1, 1, 0, NOW(), NOW()),
(98, 1, 1, 0, NOW(), NOW()),
(99, 1, 1, 0, NOW(), NOW()),
(100, 1, 1, 0, NOW(), NOW());

INSERT INTO `permission_descriptions` (`permission_description_id`, `permission_id`, `language_id`, `name`, `description`, `permission_group`, `created_at`, `updated_at`) VALUES
(96, 96, 1, 'reports.create', 'Create reports', 'Reports', NOW(), NOW()),
(97, 97, 1, 'reports.read', 'View reports', 'Reports', NOW(), NOW()),
(98, 98, 1, 'reports.update', 'Update reports', 'Reports', NOW(), NOW()),
(99, 99, 1, 'reports.delete', 'Delete reports', 'Reports', NOW(), NOW()),
(100, 100, 1, 'reports.manage', 'Full management of reports', 'Reports', NOW(), NOW());

-- ============================================================================
-- PART 2: ROLES
-- ============================================================================
-- Insert standard roles for the system
-- Note: Assumes status_id = 1 (Active), tenant_id = 0 (Global roles)
-- ============================================================================

-- Super Admin Role (Full access to everything)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(1, 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 'Super Admin', 'Super Administrator with full system access', NOW(), NOW());

-- Admin Role (Full access except system settings)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(2, 1, 0, 0, 0, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(2, 2, 1, 'Admin', 'Administrator with full tenant and project management access', NOW(), NOW());

-- Manager Role (Manage projects, tasks, and team members)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(3, 1, 0, 1, 0, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(3, 3, 1, 'Manager', 'Manager role with project and task management capabilities', NOW(), NOW());

-- Team Lead Role (Manage team tasks and processes)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(4, 1, 0, 1, 1, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(4, 4, 1, 'Team Lead', 'Team Lead with team management and task assignment capabilities', NOW(), NOW());

-- Member Role (Standard user with read and create permissions)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(5, 1, 0, 1, 1, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(5, 5, 1, 'Member', 'Standard team member with basic create and read permissions', NOW(), NOW());

-- Viewer Role (Read-only access)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(6, 1, 0, 1, 1, 0, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(6, 6, 1, 'Viewer', 'Viewer role with read-only access to projects and tasks', NOW(), NOW());

-- Customer Role (Customer-specific permissions)
INSERT INTO `roles` (`role_id`, `status_id`, `tenant_id`, `is_tenant_role`, `is_tenant_team_role`, `is_customer_role`, `created_at`, `updated_at`) VALUES
(7, 1, 0, 0, 0, 1, NOW(), NOW());

INSERT INTO `role_descriptions` (`role_description_id`, `role_id`, `language_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(7, 7, 1, 'Customer', 'Customer role with limited access to their own projects and tasks', NOW(), NOW());

-- ============================================================================
-- PART 3: ROLE-PERMISSION MAPPINGS
-- ============================================================================
-- Map permissions to roles based on their responsibilities
-- ============================================================================

-- Super Admin: All permissions (1-100)
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
(1, 1, 1, NOW()), (2, 1, 2, NOW()), (3, 1, 3, NOW()), (4, 1, 4, NOW()), (5, 1, 5, NOW()),
(6, 1, 6, NOW()), (7, 1, 7, NOW()), (8, 1, 8, NOW()), (9, 1, 9, NOW()), (10, 1, 10, NOW()),
(11, 1, 11, NOW()), (12, 1, 12, NOW()), (13, 1, 13, NOW()), (14, 1, 14, NOW()), (15, 1, 15, NOW()),
(16, 1, 16, NOW()), (17, 1, 17, NOW()), (18, 1, 18, NOW()), (19, 1, 19, NOW()), (20, 1, 20, NOW()),
(21, 1, 21, NOW()), (22, 1, 22, NOW()), (23, 1, 23, NOW()), (24, 1, 24, NOW()), (25, 1, 25, NOW()),
(26, 1, 26, NOW()), (27, 1, 27, NOW()), (28, 1, 28, NOW()), (29, 1, 29, NOW()), (30, 1, 30, NOW()),
(31, 1, 31, NOW()), (32, 1, 32, NOW()), (33, 1, 33, NOW()), (34, 1, 34, NOW()), (35, 1, 35, NOW()),
(36, 1, 36, NOW()), (37, 1, 37, NOW()), (38, 1, 38, NOW()), (39, 1, 39, NOW()), (40, 1, 40, NOW()),
(41, 1, 41, NOW()), (42, 1, 42, NOW()), (43, 1, 43, NOW()), (44, 1, 44, NOW()), (45, 1, 45, NOW()),
(46, 1, 46, NOW()), (47, 1, 47, NOW()), (48, 1, 48, NOW()), (49, 1, 49, NOW()), (50, 1, 50, NOW()),
(51, 1, 51, NOW()), (52, 1, 52, NOW()), (53, 1, 53, NOW()), (54, 1, 54, NOW()), (55, 1, 55, NOW()),
(56, 1, 56, NOW()), (57, 1, 57, NOW()), (58, 1, 58, NOW()), (59, 1, 59, NOW()), (60, 1, 60, NOW()),
(61, 1, 61, NOW()), (62, 1, 62, NOW()), (63, 1, 63, NOW()), (64, 1, 64, NOW()), (65, 1, 65, NOW()),
(66, 1, 66, NOW()), (67, 1, 67, NOW()), (68, 1, 68, NOW()), (69, 1, 69, NOW()), (70, 1, 70, NOW()),
(71, 1, 71, NOW()), (72, 1, 72, NOW()), (73, 1, 73, NOW()), (74, 1, 74, NOW()), (75, 1, 75, NOW()),
(76, 1, 76, NOW()), (77, 1, 77, NOW()), (78, 1, 78, NOW()), (79, 1, 79, NOW()), (80, 1, 80, NOW()),
(81, 1, 81, NOW()), (82, 1, 82, NOW()), (83, 1, 83, NOW()), (84, 1, 84, NOW()), (85, 1, 85, NOW()),
(86, 1, 86, NOW()), (87, 1, 87, NOW()), (88, 1, 88, NOW()), (89, 1, 89, NOW()), (90, 1, 90, NOW()),
(91, 1, 91, NOW()), (92, 1, 92, NOW()), (93, 1, 93, NOW()), (94, 1, 94, NOW()), (95, 1, 95, NOW()),
(96, 1, 96, NOW()), (97, 1, 97, NOW()), (98, 1, 98, NOW()), (99, 1, 99, NOW()), (100, 1, 100, NOW());

-- Admin: All permissions except system settings (1-90, 96-100)
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
(101, 2, 1, NOW()), (102, 2, 2, NOW()), (103, 2, 3, NOW()), (104, 2, 4, NOW()), (105, 2, 5, NOW()),
(106, 2, 6, NOW()), (107, 2, 7, NOW()), (108, 2, 8, NOW()), (109, 2, 9, NOW()), (110, 2, 10, NOW()),
(111, 2, 11, NOW()), (112, 2, 12, NOW()), (113, 2, 13, NOW()), (114, 2, 14, NOW()), (115, 2, 15, NOW()),
(116, 2, 16, NOW()), (117, 2, 17, NOW()), (118, 2, 18, NOW()), (119, 2, 19, NOW()), (120, 2, 20, NOW()),
(121, 2, 21, NOW()), (122, 2, 22, NOW()), (123, 2, 23, NOW()), (124, 2, 24, NOW()), (125, 2, 25, NOW()),
(126, 2, 26, NOW()), (127, 2, 27, NOW()), (128, 2, 28, NOW()), (129, 2, 29, NOW()), (130, 2, 30, NOW()),
(131, 2, 31, NOW()), (132, 2, 32, NOW()), (133, 2, 33, NOW()), (134, 2, 34, NOW()), (135, 2, 35, NOW()),
(136, 2, 36, NOW()), (137, 2, 37, NOW()), (138, 2, 38, NOW()), (139, 2, 39, NOW()), (140, 2, 40, NOW()),
(141, 2, 41, NOW()), (142, 2, 42, NOW()), (143, 2, 43, NOW()), (144, 2, 44, NOW()), (145, 2, 45, NOW()),
(146, 2, 46, NOW()), (147, 2, 47, NOW()), (148, 2, 48, NOW()), (149, 2, 49, NOW()), (150, 2, 50, NOW()),
(151, 2, 51, NOW()), (152, 2, 52, NOW()), (153, 2, 53, NOW()), (154, 2, 54, NOW()), (155, 2, 55, NOW()),
(156, 2, 56, NOW()), (157, 2, 57, NOW()), (158, 2, 58, NOW()), (159, 2, 59, NOW()), (160, 2, 60, NOW()),
(161, 2, 61, NOW()), (162, 2, 62, NOW()), (163, 2, 63, NOW()), (164, 2, 64, NOW()), (165, 2, 65, NOW()),
(166, 2, 66, NOW()), (167, 2, 67, NOW()), (168, 2, 68, NOW()), (169, 2, 69, NOW()), (170, 2, 70, NOW()),
(171, 2, 71, NOW()), (172, 2, 72, NOW()), (173, 2, 73, NOW()), (174, 2, 74, NOW()), (175, 2, 75, NOW()),
(176, 2, 76, NOW()), (177, 2, 77, NOW()), (178, 2, 78, NOW()), (179, 2, 79, NOW()), (180, 2, 80, NOW()),
(181, 2, 81, NOW()), (182, 2, 82, NOW()), (183, 2, 83, NOW()), (184, 2, 84, NOW()), (185, 2, 85, NOW()),
(186, 2, 86, NOW()), (187, 2, 87, NOW()), (188, 2, 88, NOW()), (189, 2, 89, NOW()), (190, 2, 90, NOW()),
(191, 2, 96, NOW()), (192, 2, 97, NOW()), (193, 2, 98, NOW()), (194, 2, 99, NOW()), (195, 2, 100, NOW());

-- Manager: Projects, Tasks, Process Templates, Process Instances, Categories, Customers, Sharing (read/write)
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
-- Projects: All
(196, 3, 31, NOW()), (197, 3, 32, NOW()), (198, 3, 33, NOW()), (199, 3, 34, NOW()), (200, 3, 35, NOW()),
-- Tasks: All
(201, 3, 36, NOW()), (202, 3, 37, NOW()), (203, 3, 38, NOW()), (204, 3, 39, NOW()), (205, 3, 40, NOW()),
-- Process Templates: Read only
(206, 3, 42, NOW()),
-- Process Instances: All
(207, 3, 46, NOW()), (208, 3, 47, NOW()), (209, 3, 48, NOW()), (210, 3, 49, NOW()), (211, 3, 50, NOW()),
-- Categories: All
(212, 3, 51, NOW()), (213, 3, 52, NOW()), (214, 3, 53, NOW()), (215, 3, 54, NOW()), (216, 3, 55, NOW()),
-- Customers: Read/Update
(217, 3, 57, NOW()), (218, 3, 58, NOW()),
-- Sharing: All
(219, 3, 61, NOW()), (220, 3, 62, NOW()), (221, 3, 63, NOW()), (222, 3, 64, NOW()), (223, 3, 65, NOW()),
-- Storage: All
(224, 3, 76, NOW()), (225, 3, 77, NOW()), (226, 3, 78, NOW()), (227, 3, 79, NOW()), (228, 3, 80, NOW()),
-- Notifications: Read
(229, 3, 82, NOW()),
-- Tenant Users: Read
(230, 3, 22, NOW()),
-- Tenant Teams: Read
(231, 3, 27, NOW());

-- Team Lead: Tasks, Process Instances, Sharing (limited)
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
-- Projects: Read
(232, 4, 32, NOW()),
-- Tasks: All
(233, 4, 36, NOW()), (234, 4, 37, NOW()), (235, 4, 38, NOW()), (236, 4, 39, NOW()), (237, 4, 40, NOW()),
-- Process Templates: Read
(238, 4, 42, NOW()),
-- Process Instances: All
(239, 4, 46, NOW()), (240, 4, 47, NOW()), (241, 4, 48, NOW()), (242, 4, 49, NOW()), (243, 4, 50, NOW()),
-- Categories: Read
(244, 4, 52, NOW()),
-- Sharing: Read/Create
(245, 4, 61, NOW()), (246, 4, 62, NOW()),
-- Storage: Read/Create/Update
(247, 4, 76, NOW()), (248, 4, 77, NOW()), (249, 4, 78, NOW()),
-- Notifications: Read
(250, 4, 82, NOW()),
-- Tenant Teams: Read/Create/Update/Delete/Manage
(251, 4, 27, NOW()),
(312, 4, 26, NOW()), (313, 4, 28, NOW()), (314, 4, 29, NOW()), (315, 4, 30, NOW());

-- Member: Create and Read permissions for assigned resources
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
-- Projects: Read
(252, 5, 32, NOW()),
-- Tasks: Create, Read, Update (own tasks)
(253, 5, 36, NOW()), (254, 5, 37, NOW()), (255, 5, 38, NOW()),
-- Process Templates: Read
(256, 5, 42, NOW()),
-- Process Instances: Create, Read, Update (own instances)
(257, 5, 46, NOW()), (258, 5, 47, NOW()), (259, 5, 48, NOW()),
-- Categories: Read
(260, 5, 52, NOW()),
-- Sharing: Read
(261, 5, 62, NOW()),
-- Storage: Create, Read
(262, 5, 76, NOW()), (263, 5, 77, NOW()),
-- Notifications: Read
(264, 5, 82, NOW()),
-- Tenant Teams: Read
(316, 5, 27, NOW());

-- Viewer: Read-only access
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
-- Projects: Read
(265, 6, 32, NOW()),
-- Tasks: Read
(266, 6, 37, NOW()),
-- Process Templates: Read
(267, 6, 42, NOW()),
-- Process Instances: Read
(268, 6, 47, NOW()),
-- Categories: Read
(269, 6, 52, NOW()),
-- Customers: Read
(270, 6, 57, NOW()),
-- Sharing: Read
(271, 6, 62, NOW()),
-- Storage: Read
(272, 6, 77, NOW()),
-- Notifications: Read
(273, 6, 82, NOW()),
-- Tenant Teams: Read
(317, 6, 27, NOW());

-- Customer: Limited access to their own projects and tasks
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`) VALUES
-- Projects: Read (own projects)
(274, 7, 32, NOW()),
-- Tasks: Read, Update (own tasks)
(275, 7, 37, NOW()), (276, 7, 38, NOW()),
-- Process Instances: Read (own instances)
(277, 7, 47, NOW()),
-- Storage: Read
(278, 7, 77, NOW()),
-- Notifications: Read
(279, 7, 82, NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- Idempotent Team Lead / Member / Viewer tenant_teams grants (safe on existing DBs).
-- Uses high IDs to avoid collisions with config.* grants at 280+ on live DBs.
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 312, 4, 26, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 4 AND `permission_id` = 26);
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 313, 4, 28, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 4 AND `permission_id` = 28);
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 314, 4, 29, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 4 AND `permission_id` = 29);
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 315, 4, 30, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 4 AND `permission_id` = 30);
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 316, 5, 27, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 5 AND `permission_id` = 27);
INSERT INTO `role_permissions` (`role_permission_id`, `role_id`, `permission_id`, `created_at`)
SELECT 317, 6, 27, NOW() FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role_permissions` WHERE `role_id` = 6 AND `permission_id` = 27);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This seed file includes:
-- - 100 Permissions across 20 modules (Users, Roles, Permissions, Tenants,
--   Tenant Users, Tenant Teams, Projects, Tasks, Process Templates,
--   Process Instances, Categories, Customers, Sharing, Automation,
--   Scheduler, Storage, Notifications, Events, Settings, Reports)
-- - 7 Standard Roles (Super Admin, Admin, Manager, Team Lead, Member, Viewer, Customer)
-- - Role-Permission mappings for each role
--
-- To use this seed file:
-- 1. Ensure system_statuses table has status_id = 1 (Active)
-- 2. Ensure system_languages table has language_id = 1 (English)
-- 3. Ensure users table has user_id = 1 (System user)
-- 4. Run: mysql -u [username] -p [database] < seed_roles_permissions.sql
-- ============================================================================

