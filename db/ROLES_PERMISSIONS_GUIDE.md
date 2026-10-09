# Roles and Permissions System Guide

## Overview

This guide provides information about the roles and permissions system in SIX1 Core API, including API endpoints, database structure, and how to use the seed data.

## Database Schema

### Tables Structure

1. **`permissions`** - Core permissions table
   - `permission_id` (Primary Key)
   - `status_id` (Foreign Key to `system_statuses`)
   - `created_by` (Foreign Key to `users`)
   - `updated_by` (Foreign Key to `users`)
   - `created_at`, `updated_at`

2. **`permission_descriptions`** - Multilingual permission descriptions
   - `permission_description_id` (Primary Key)
   - `permission_id` (Foreign Key to `permissions`)
   - `language_id` (Foreign Key to `system_languages`)
   - `name` (Unique permission identifier, e.g., "users.create")
   - `description` (Human-readable description)
   - `permission_group` (Grouping, e.g., "Users", "Projects")

3. **`roles`** - Core roles table
   - `role_id` (Primary Key)
   - `status_id` (Foreign Key to `system_statuses`)
   - `tenant_id` (Foreign Key to `tenants`, 0 for global roles)
   - `is_tenant_role` (Boolean: 0/1)
   - `is_tenant_team_role` (Boolean: 0/1)
   - `is_customer_role` (Boolean: 0/1)
   - `created_at`, `updated_at`

4. **`role_descriptions`** - Multilingual role descriptions
   - `role_description_id` (Primary Key)
   - `role_id` (Foreign Key to `roles`)
   - `language_id` (Foreign Key to `system_languages`)
   - `name` (Role name, e.g., "Super Admin")
   - `description` (Human-readable description)

5. **`role_permissions`** - Many-to-many relationship between roles and permissions
   - `role_permission_id` (Primary Key)
   - `role_id` (Foreign Key to `roles`)
   - `permission_id` (Foreign Key to `permissions`)
   - `created_at`
   - Unique constraint on (`role_id`, `permission_id`)

6. **`user_roles`** - Many-to-many relationship between users and roles
   - `user_role_id` (Primary Key)
   - `user_id` (Foreign Key to `users`)
   - `role_id` (Foreign Key to `roles`)
   - `created_by` (Foreign Key to `users`)
   - `created_at`
   - Unique constraint on (`user_id`, `role_id`)

7. **`tenant_user_roles`** - Many-to-many relationship between tenant users and roles
   - `tenant_user_role_id` (Primary Key)
   - `tenant_user_id` (Foreign Key to `tenant_users`)
   - `role_id` (Foreign Key to `roles`)
   - `created_by` (Foreign Key to `tenant_users`)
   - `created_at`
   - Unique constraint on (`tenant_user_id`, `role_id`)

## API Endpoints

### Permissions API

The permissions API uses microservice message patterns. All endpoints require a `userId` in the payload.

#### Message Patterns

- **Create Permission**: `v0.1_create_permission`
- **Find All Permissions**: `v0.1_find_all_permission`
- **Find One Permission**: `v0.1_find_one_permission`
- **Update Permission**: `v0.1_update_permission`
- **Remove Permission**: `v0.1_remove_permission`

#### Example Request Structure

```typescript
// Create Permission
{
  userId: number,
  data: {
    descriptions: [
      {
        languageId: number,
        name: string,        // e.g., "users.create"
        description: string,
        permissionGroup: string  // e.g., "Users"
      }
    ]
  }
}

// Find All Permissions
{
  userId: number,
  data: {
    // FiltersDto - pagination, sorting, etc.
  }
}

// Find One Permission
{
  userId: number,
  data: permissionId: number
}

// Update Permission
{
  userId: number,
  data: {
    permission_id: number,
    descriptions: [...],
    status_id?: number
  }
}

// Remove Permission
{
  userId: number,
  data: permissionId: number
}
```

### Roles API

The roles API uses microservice message patterns. All endpoints require a `userId` in the payload.

#### Message Patterns

- **Create Role**: `v0.1_create_role`
- **Find All Roles**: `v0.1_find_all_role`
- **Find One Role**: `v0.1_find_one_role`
- **Update Role**: `v0.1_update_role`
- **Remove Role**: `v0.1_remove_role`

#### Example Request Structure

```typescript
// Create Role
{
  userId: number,
  data: {
    statusId: number,
    tenantId?: number,
    isTenantRole?: boolean,
    isTenantTeamRole?: boolean,
    isCustomerRole?: boolean,
    descriptions: [
      {
        languageId: number,
        name: string,        // e.g., "Super Admin"
        description: string
      }
    ],
    permissions: [
      {
        permissionId: number
      }
    ]
  }
}

// Find All Roles
{
  userId: number,
  data: {
    // FiltersDto - pagination, sorting, etc.
  }
}

// Find One Role
{
  userId: number,
  data: roleId: number
}

// Update Role
{
  userId: number,
  data: {
    roleId: number,
    statusId?: number,
    descriptions?: [...],
    permissions?: [...]
  }
}

// Remove Role
{
  userId: number,
  data: roleId: number
}
```

## Seed Data

### Prerequisites

Before running the seed file, ensure:

1. **System Statuses**: `system_statuses` table must have `status_id = 1` (Active)
   ```sql
   INSERT INTO `system_statuses` (`status_id`, `name`, `module_name`, `module_identifier`) 
   VALUES (1, 'Active', 'System', 'active') 
   ON DUPLICATE KEY UPDATE `name`='Active';
   ```

2. **System Languages**: `system_languages` table must have `language_id = 1` (English)
   ```sql
   INSERT INTO `system_languages` (`language_id`, `name`, `lang_code`, `is_active`) 
   VALUES (1, 'English', 'en', 1) 
   ON DUPLICATE KEY UPDATE `name`='English';
   ```

3. **System User**: `users` table must have `user_id = 1` (System user for created_by)
   ```sql
   INSERT INTO `users` (`user_id`, `email`, `username`, `password`, `status`) 
   VALUES (1, 'system@six1.com', 'system', '[hashed_password]', 1) 
   ON DUPLICATE KEY UPDATE `email`='system@six1.com';
   ```

### Running the Seed File

```bash
mysql -u [username] -p [database_name] < db/seed_roles_permissions.sql
```

Or using MySQL client:

```sql
SOURCE /path/to/seed_roles_permissions.sql;
```

### What Gets Seeded

#### Permissions (100 permissions across 20 modules)

1. **Users Module** (5 permissions)
   - users.create, users.read, users.update, users.delete, users.manage

2. **Roles Module** (5 permissions)
   - roles.create, roles.read, roles.update, roles.delete, roles.manage

3. **Permissions Module** (5 permissions)
   - permissions.create, permissions.read, permissions.update, permissions.delete, permissions.manage

4. **Tenants Module** (5 permissions)
   - tenants.create, tenants.read, tenants.update, tenants.delete, tenants.manage

5. **Tenant Users Module** (5 permissions)
   - tenant_users.create, tenant_users.read, tenant_users.update, tenant_users.delete, tenant_users.manage

6. **Tenant Teams Module** (5 permissions)
   - tenant_teams.create, tenant_teams.read, tenant_teams.update, tenant_teams.delete, tenant_teams.manage

7. **Projects Module** (5 permissions)
   - projects.create, projects.read, projects.update, projects.delete, projects.manage

8. **Tasks Module** (5 permissions)
   - tasks.create, tasks.read, tasks.update, tasks.delete, tasks.manage

9. **Process Templates Module** (5 permissions)
   - process_templates.create, process_templates.read, process_templates.update, process_templates.delete, process_templates.manage

10. **Process Instances Module** (5 permissions)
    - process_instances.create, process_instances.read, process_instances.update, process_instances.delete, process_instances.manage

11. **Categories Module** (5 permissions)
    - categories.create, categories.read, categories.update, categories.delete, categories.manage

12. **Customers Module** (5 permissions)
    - customers.create, customers.read, customers.update, customers.delete, customers.manage

13. **Sharing Module** (5 permissions)
    - sharing.create, sharing.read, sharing.update, sharing.delete, sharing.manage

14. **Automation Module** (5 permissions)
    - automation.create, automation.read, automation.update, automation.delete, automation.manage

15. **Scheduler Module** (5 permissions)
    - scheduler.create, scheduler.read, scheduler.update, scheduler.delete, scheduler.manage

16. **Storage Module** (5 permissions)
    - storage.create, storage.read, storage.update, storage.delete, storage.manage

17. **Notifications Module** (5 permissions)
    - notifications.create, notifications.read, notifications.update, notifications.delete, notifications.manage

18. **Events Module** (5 permissions)
    - events.create, events.read, events.update, events.delete, events.manage

19. **Settings Module** (5 permissions)
    - settings.create, settings.read, settings.update, settings.delete, settings.manage

20. **Reports Module** (5 permissions)
    - reports.create, reports.read, reports.update, reports.delete, reports.manage

#### Roles (7 standard roles)

1. **Super Admin** (Role ID: 1)
   - Full access to all permissions (1-100)
   - Global role (not tenant-specific)

2. **Admin** (Role ID: 2)
   - All permissions except system settings (1-90, 96-100)
   - Global role (not tenant-specific)

3. **Manager** (Role ID: 3)
   - Projects: Full access
   - Tasks: Full access
   - Process Templates: Read only
   - Process Instances: Full access
   - Categories: Full access
   - Customers: Read/Update
   - Sharing: Full access
   - Storage: Full access
   - Notifications: Read
   - Tenant Users: Read
   - Tenant Teams: Read
   - Tenant role

4. **Team Lead** (Role ID: 4)
   - Projects: Read
   - Tasks: Full access
   - Process Templates: Read
   - Process Instances: Full access
   - Categories: Read
   - Sharing: Read/Create
   - Storage: Read/Create/Update
   - Notifications: Read
   - Tenant Teams: Read
   - Tenant and Team role

5. **Member** (Role ID: 5)
   - Projects: Read
   - Tasks: Create, Read, Update (own tasks)
   - Process Templates: Read
   - Process Instances: Create, Read, Update (own instances)
   - Categories: Read
   - Sharing: Read
   - Storage: Create, Read
   - Notifications: Read
   - Tenant and Team role

6. **Viewer** (Role ID: 6)
   - Read-only access to Projects, Tasks, Process Templates, Process Instances, Categories, Customers, Sharing, Storage, Notifications
   - Tenant and Team role

7. **Customer** (Role ID: 7)
   - Projects: Read (own projects)
   - Tasks: Read, Update (own tasks)
   - Process Instances: Read (own instances)
   - Storage: Read
   - Notifications: Read
   - Customer role

## Usage Examples

### Check User Permissions

```sql
-- Get all permissions for a user
SELECT DISTINCT pd.name, pd.permission_group, pd.description
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permission_descriptions pd ON rp.permission_id = pd.permission_id
WHERE ur.user_id = [USER_ID]
AND pd.language_id = 1;
```

### Check Tenant User Permissions

```sql
-- Get all permissions for a tenant user
SELECT DISTINCT pd.name, pd.permission_group, pd.description
FROM tenant_user_roles tur
JOIN role_permissions rp ON tur.role_id = rp.role_id
JOIN permission_descriptions pd ON rp.permission_id = pd.permission_id
WHERE tur.tenant_user_id = [TENANT_USER_ID]
AND pd.language_id = 1;
```

### Assign Role to User

```sql
-- Assign a role to a user
INSERT INTO user_roles (user_id, role_id, created_by, created_at)
VALUES ([USER_ID], [ROLE_ID], [CREATED_BY_USER_ID], NOW());
```

### Assign Role to Tenant User

```sql
-- Assign a role to a tenant user
INSERT INTO tenant_user_roles (tenant_user_id, role_id, created_by, created_at)
VALUES ([TENANT_USER_ID], [ROLE_ID], [CREATED_BY_TENANT_USER_ID], NOW());
```

### Check if User Has Permission

```sql
-- Check if a user has a specific permission
SELECT COUNT(*) > 0 AS has_permission
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permission_descriptions pd ON rp.permission_id = pd.permission_id
WHERE ur.user_id = [USER_ID]
AND pd.name = 'projects.create'
AND pd.language_id = 1;
```

## Authorization Implementation

### In Your Application Code

1. **Check Permission Before Action**:
   ```typescript
   // Example: Check if user can create a project
   const hasPermission = await checkUserPermission(userId, 'projects.create');
   if (!hasPermission) {
     throw new ForbiddenException('Insufficient permissions');
   }
   ```

2. **Role-Based Access Control (RBAC)**:
   ```typescript
   // Example: Check if user has Manager role or higher
   const userRoles = await getUserRoles(userId);
   const isManagerOrAbove = userRoles.some(role => 
     ['Super Admin', 'Admin', 'Manager'].includes(role.name)
   );
   ```

3. **Permission-Based Guards**:
   ```typescript
   // Create a guard decorator
   @RequirePermission('projects.create')
   @Post('projects')
   async createProject(@Body() createProjectDto: CreateProjectDto) {
     // ...
   }
   ```

## Customization

### Adding New Permissions

1. Insert into `permissions` table
2. Insert description(s) into `permission_descriptions` table
3. Map to roles in `role_permissions` table

### Adding New Roles

1. Insert into `roles` table
2. Insert description(s) into `role_descriptions` table
3. Map permissions in `role_permissions` table

### Tenant-Specific Roles

Set `tenant_id` when creating a role to make it tenant-specific:
```sql
INSERT INTO roles (status_id, tenant_id, is_tenant_role, ...)
VALUES (1, [TENANT_ID], 1, ...);
```

## Notes

- All timestamps use `NOW()` for consistency
- Permission names follow the pattern: `[module].[action]`
- Permission groups help organize permissions in the UI
- Roles can be global (`tenant_id = 0`) or tenant-specific
- The seed file uses `created_by = 1` assuming a system user exists
- Language support is built-in via `permission_descriptions` and `role_descriptions` tables

