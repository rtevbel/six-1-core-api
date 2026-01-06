# Authorization Implementation Summary

## Overview

Authorization has been successfully implemented across the SIX1 Core API using role-based access control (RBAC). This document summarizes what has been completed.

## Completed Components

### 1. Authorization Module
- **Location**: `src/authorization/`
- **Files**:
  - `authorization.module.ts` - Module configuration with global guard
  - `authorization.service.ts` - Permission checking logic
  - `authorization.guard.ts` - Guard that enforces permissions
  - `authorization.decorator.ts` - `@RequirePermissions()` decorator
  - `constants.ts` - Metadata key constants

### 2. Controllers with Permissions

The following controllers have been annotated with `@RequirePermissions` decorators:

#### ✅ Core Modules (Completed)
- **Projects Controller** (`src/projects/projects.controller.ts`)
  - `projects.create` - Create project
  - `projects.read` - List/Get projects
  - `projects.update` - Update project
  - `projects.delete` - Delete project

- **Tasks Controller** (`src/projects/tasks/tasks.controller.ts`)
  - `tasks.create` - Create task
  - `tasks.read` - List/Get tasks
  - `tasks.update` - Update task
  - `tasks.delete` - Delete task

- **Process Templates Controller** (`src/process_templates/process_templates.controller.ts`)
  - `process_templates.create` - Create process template
  - `process_templates.read` - List/Get process templates
  - `process_templates.update` - Update process template
  - `process_templates.delete` - Delete process template

- **Process Instances Controller** (`src/process_instances/process_instances.controller.ts`)
  - `process_instances.create` - Create process instance
  - `process_instances.read` - List/Get process instances
  - `process_instances.update` - Update process instance
  - `process_instances.delete` - Delete process instance

- **Categories Controller** (`src/categories/categories.controller.ts`)
  - `categories.create` - Create category
  - `categories.read` - List/Get categories
  - `categories.update` - Update category
  - `categories.delete` - Delete category

- **Customers Controller** (`src/customers/customers.controller.ts`)
  - `customers.create` - Create customer
  - `customers.read` - List/Get customers
  - `customers.update` - Update customer
  - `customers.delete` - Delete customer

#### ⏳ Additional Controllers (To Be Annotated)
The following controllers should be annotated as needed:
- Users, Roles, Permissions (system/admin level)
- Tenants, Tenant Users, Tenant Teams
- Sharing, Storage, Notifications, Events
- Scheduler, Automation
- Other sub-modules

## How It Works

### 1. Permission Checking Flow

```
Request → AuthorizationGuard → Extract userId → Check Permissions → Allow/Deny
```

### 2. User Context Extraction

The guard extracts `userId` from:
- **HTTP Requests**: `request.user.userId` (from JWT strategy) or `request.body.userId`
- **RPC Calls**: `data.userId` or `data.user_id` from the payload

### 3. Permission Hierarchy

The system supports hierarchical permissions:
- `module.manage` grants access to all `module.*` actions
- Example: `projects.manage` grants `projects.create`, `projects.read`, `projects.update`, `projects.delete`

### 4. JWT Strategy

The JWT strategy (`src/auth/strategies/jwt.strategy.ts`) already returns:
```typescript
{ username: Payload.username, userId: Payload.userId }
```

This makes `userId` available as `request.user.userId` for HTTP requests.

### 5. RPC Payload Structure

For RPC calls, the payload structure is:
```typescript
{
  userId: number,
  data: { ... }
}
```

The guard extracts `userId` from the top-level of the payload object.

## Usage Examples

### Adding Permissions to a Controller

```typescript
import { RequirePermissions } from '../authorization/authorization.decorator';

@Controller('example')
export class ExampleController {
  @MessagePattern('create_example')
  @RequirePermissions('examples.create')
  @UsePipes(AppRpcValidationPipe)
  createExample(
    @Payload('userId', ParseIntPipe) userId: number,
    @Payload('data') dto: CreateExampleDto,
  ) {
    // Handler implementation
  }
}
```

### Multiple Permissions

```typescript
@RequirePermissions('projects.read', 'tasks.read')
@MessagePattern('get_dashboard')
getDashboard() {
  // Requires both permissions
}
```

## Database Setup

The seed data has been applied (`db/seed_roles_permissions.sql`):
- ✅ 100 permissions across 20 modules
- ✅ 7 standard roles (Super Admin, Admin, Manager, Team Lead, Member, Viewer, Customer)
- ✅ Role-permission mappings

## Testing Authorization

### Check User Permissions (SQL)

```sql
-- Get all permissions for a user
SELECT DISTINCT pd.name, pd.permission_group
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permission_descriptions pd ON rp.permission_id = pd.permission_id
WHERE ur.user_id = [USER_ID]
AND pd.language_id = 1;
```

### Assign Role to User

```sql
INSERT INTO user_roles (user_id, role_id, created_by, created_at)
VALUES ([USER_ID], [ROLE_ID], [CREATED_BY_USER_ID], NOW());
```

## Next Steps

1. ✅ **Completed**: Core controllers annotated with permissions
2. ⏳ **Pending**: Annotate remaining controllers as needed
3. ✅ **Completed**: JWT strategy verified (returns userId)
4. ✅ **Completed**: Guard handles both HTTP and RPC contexts
5. ⏳ **Optional**: Add unit tests for authorization service
6. ⏳ **Optional**: Add integration tests for permission checks

## Notes

- The guard is registered globally, so it applies to all routes
- Routes without `@RequirePermissions` decorator are allowed (no restrictions)
- Permission checks happen before the handler executes
- If permission check fails, a `ForbiddenException` is thrown
- If `userId` is missing, an `UnauthorizedException` is thrown

## Troubleshooting

### "User context is missing" Error
- Ensure `userId` is included in RPC payloads: `{ userId: 123, data: {...} }`
- For HTTP requests, ensure JWT authentication is working and `request.user.userId` is set

### "Insufficient permissions" Error
- Check that the user has the required role assigned
- Verify the role has the required permission
- Check permission name matches exactly (case-sensitive)

### Permission Not Working
- Verify the permission exists in the database
- Check the permission name matches the seed data format: `module.action`
- Ensure the user's role is properly assigned and active

