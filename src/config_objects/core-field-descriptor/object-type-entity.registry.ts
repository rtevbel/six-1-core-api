import { getMetadataArgsStorage } from 'typeorm';

import { CategoryDescriptionEntity } from '../../categories/entities/category-description.entity';
import { CategoryEntity } from '../../categories/entities/category.entity';
import { ConfigAuditLogEntity } from '../entities/config_audit_log.entity';
import { ConfigCustomObjectInstanceEntity } from '../entities/config_custom_object_instance.entity';
import { ConfigObjectEntity } from '../entities/config_object.entity';
import { ConfigObjectFieldEntity } from '../entities/config_object_field.entity';
import { ConfigObjectFieldRuleEntity } from '../entities/config_object_field_rule.entity';
import { ConfigObjectLifecycleEntity } from '../entities/config_object_lifecycle.entity';
import { ConfigObjectLifecycleTransitionEntity } from '../entities/config_object_lifecycle_transition.entity';
import { ConfigObjectRelationshipEntity } from '../entities/config_object_relationship.entity';
import { ConfigObjectStatusMappingEntity } from '../entities/config_object_status_mapping.entity';
import { ConfigObjectViewEntity } from '../entities/config_object_view.entity';
import { ConfigObjectViewPanelEntity } from '../entities/config_object_view_panel.entity';
import { ConfigTemplateSetEntity } from '../entities/config_template_set.entity';
import { CustomerContactInfoEntity } from '../../customers/customer_contact_info/entities/customer_contact_info.entity';
import { CustomerContactInfoMetaEntity } from '../../customers/customer_contact_info/entities/customer_contact_info_meta.entity';
import { CustomerInvitationEntity } from '../../customers/customer_invitations/entities/customer_invitation.entity';
import { CustomerProjectMemberEntity } from '../../customers/customer_project_members/entities/customer_project_member.entity';
import { CustomerTaskMemberEntity } from '../../customers/customer_task_members/entities/customer_task_member.entity';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { CustomerMetaEntity } from '../../customers/entities/customer_meta.entity';
import { EventEntity } from '../../events/entities/event.entity';
import { EventListenerEntity } from '../../events/event_listeners/entities/event_listener.entity';
import { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { NotificationEntity } from '../../notifications/entities/notification.entity';
import { NotificationChannelEntity } from '../../notifications/notification_channels/entities/notification_channel.entity';
import { NotificationLogEntity } from '../../notifications/notification_logs/entities/notification_log.entity';
import { NotificationTemplateEntity } from '../../notifications/notification_templates/entities/notification_template.entity';
import { PermissionDescriptionEntity } from '../../permissions/entities/permission_description.entity';
import { PermissionEntity } from '../../permissions/entities/permission.entity';
import { ProcessInstanceEntity } from '../../process_instances/entities/process_instance.entity';
import { ProcessInstanceStepEntity } from '../../process_instances/process_instance_steps/entities/process_instance_step.entity';
import { ProcessInstanceStepRequirementSubmissionEntity } from '../../process_instances/process_instance_steps/process_instance_step_requirement_submissions/entities/process_instance_step_requirement_submission.entity';
import { ProcessInstanceStepRequirementEntity } from '../../process_instances/process_instance_steps/process_instance_step_requirements/entities/process_instance_step_requirement.entity';
import { ProcessInstanceStepTriggerEntity } from '../../process_instances/process_instance_steps/process_instance_step_trigger_conditions/entities/process_instance_step_trigger_condition.entity';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import { ProcessTemplateCategoryEntity } from '../../process_templates/entities/process_template_category.entity';
import { ProcessTemplateDescriptionEntity } from '../../process_templates/entities/process_template_description.entity';
import { ProcessTemplateStepEntity } from '../../process_templates/process_template_steps/entities/process_template_step.entity';
import { ProcessTemplateStepDescriptionEntity } from '../../process_templates/process_template_steps/entities/process_template_step_description.entity';
import { ProcessTemplateStepRequirementSubmissionEntity } from '../../process_templates/process_template_steps/process_template_step_requirement_submissions/entities/process_template_step_requirement_submission.entity';
import { ProcessTemplateStepRequirementEntity } from '../../process_templates/process_template_steps/process_template_step_requirements/entities/process_template_step_requirement.entity';
import { ProcessTemplateStepTriggerConditionSubmissionEntity } from '../../process_templates/process_template_steps/process_template_step_trigger_condition_submissions/entities/process_template_step_trigger_condition_submission.entity';
import { ProcessTemplateStepTriggerConditionEntity } from '../../process_templates/process_template_steps/process_template_step_trigger_conditions/entities/process_template_step_trigger_condition.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { ProjectMetaEntity } from '../../projects/entities/project_meta.entity';
import { ProjectStepStatusMappingEntity } from '../../projects/entities/project_step_status_mappings.entity';
import { ProjectTaskStatusEntity } from '../../projects/project_task_statuses/entities/project_task_status.entity';
import { TaskAttachmentsEntity } from '../../projects/tasks/attachments/entities/attachment.entity';
import { TaskCommentsEntity } from '../../projects/tasks/comments/entities/comment.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { TaskMetaEntity } from '../../projects/tasks/entities/task_meta.entity';
import { TaskMentionsEntity } from '../../projects/tasks/mentions/entities/mention.entity';
import { RoleDescriptionEntity } from '../../roles/entities/role-description.entity';
import { RolePermissionEntity } from '../../roles/entities/role-permission.entity';
import { RoleEntity } from '../../roles/entities/role.entity';
import { ResourceEntity } from '../../scheduler/entities/resource.entity';
import { ResourceAssignmentEntity } from '../../scheduler/entities/resource_assignment.entity';
import { ResourceAssignmentShiftEntity } from '../../scheduler/entities/resource_assignment_shifts.entity';
import { ResourceAvailabilityEntity } from '../../scheduler/entities/resource_availability.entity';
import { ResourceBlackoutDateEntity } from '../../scheduler/entities/resource_blackout_date.entity';
import { ResourceMetaEntity } from '../../scheduler/entities/resource_meta.entity';
import { ScheduledTaskEntity } from '../../scheduler/entities/scheduled_task.entity';
import { ScheduledTaskEventsEntity } from '../../scheduler/entities/scheduled_task_event.entity';
import { ScheduledTaskHistoryEntity } from '../../scheduler/entities/scheduled_task_history.entity';
import { TaskDependencyEntity } from '../../scheduler/entities/task_dependency.entity';
import { SystemLanguageEntity } from '../../settings/system_languages/entities/system-language.entity';
import { SystemStatusEntity } from '../../settings/system_statuses/entities/system-status.entity';
import { SharedProjectEntity } from '../../sharing/entities/shared_project.entity';
import { SharedResourceEntity } from '../../sharing/entities/shared_resource.entity';
import { SharedTaskEntity } from '../../sharing/entities/shared_task.entity';
import { SharingInvitationEntity } from '../../sharing/entities/sharing_invitation.entity';
import { SharingLogEntity } from '../../sharing/entities/sharing_log.entity';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantBillingInfoEntity } from '../../tenants/tenant_billing_info/entities/tenant_billing_info.entity';
import { TenantConfigurationsEntity } from '../../tenants/tenant_configurations/entities/tenant_configuration.entity';
import { TenantContactInfoEntity } from '../../tenants/tenant_contact_info/entities/tenant_contact_info.entity';
import { TenantMetaEntity } from '../../tenants/tenant_meta/entities/tenant_meta.entity';
import { TenantOffDaysEntity } from '../../tenants/tenant_off_days/entities/tenant_off_day.entity';
import { TenantSubscriptionEntity } from '../../tenants/tenant_subscriptions/entities/tenant_subscription.entity';
import { TenantTeamEntity } from '../../tenants/tenant_teams/entities/tenant_team.entity';
import { TenantTeamMemberEntity } from '../../tenants/tenant_teams/tenant_team_members/entities/tenant_team_member.entity';
import { TenantTeamProjectEntity } from '../../tenants/tenant_teams/tenant_team_projects/entities/tenant_team_project.entity';
import { TenantTypeEntity } from '../../tenants/tenant_types/entities/tenant_type.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';
import { TenantUserConfigurationsEntity } from '../../tenants/tenant_users/tenant_user_configurations/entities/tenant_user_configuration.entity';
import { TenantUserInvitationsEntity } from '../../tenants/tenant_users/tenant_user_invitations/entities/tenant_user_invitation.entity';
import { TenantUserMetaEntity } from '../../tenants/tenant_users/tenant_user_meta/entities/tenant_user_meta.entity';
import { TenantUserOffDaysEntity } from '../../tenants/tenant_users/tenant_user_off_days/entities/tenant_user_off_day.entity';
import { TenantUserRoleEntity } from '../../tenants/tenant_users/tenant_user_roles/entities/tenant_user_role.entity';
import { TenantUserWorkingHoursEntity } from '../../tenants/tenant_users/tenant_user_working_hours/entities/tenant_user_working_hour.entity';
import { TenantWorkingHoursEntity } from '../../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { UserMetaEntity } from '../../users/user-meta/entities/user-meta.entity';
import { UserNotificationPreferenceEntity } from '../../users/user-notification-preferences/entities/user-notification-preference.entity';
import { UserRoleEntity } from '../../users/user-roles/entities/user-role.entity';

const ENTITY_CLASSES: Function[] = [
  CategoryDescriptionEntity,
  CategoryEntity,
  ConfigAuditLogEntity,
  ConfigCustomObjectInstanceEntity,
  ConfigObjectEntity,
  ConfigObjectFieldEntity,
  ConfigObjectFieldRuleEntity,
  ConfigObjectLifecycleEntity,
  ConfigObjectLifecycleTransitionEntity,
  ConfigObjectRelationshipEntity,
  ConfigObjectStatusMappingEntity,
  ConfigObjectViewEntity,
  ConfigObjectViewPanelEntity,
  ConfigTemplateSetEntity,
  CustomerContactInfoEntity,
  CustomerContactInfoMetaEntity,
  CustomerInvitationEntity,
  CustomerProjectMemberEntity,
  CustomerTaskMemberEntity,
  CustomerEntity,
  CustomerMetaEntity,
  EventEntity,
  EventListenerEntity,
  EventLogEntity,
  NotificationEntity,
  NotificationChannelEntity,
  NotificationLogEntity,
  NotificationTemplateEntity,
  PermissionDescriptionEntity,
  PermissionEntity,
  ProcessInstanceEntity,
  ProcessInstanceStepEntity,
  ProcessInstanceStepRequirementSubmissionEntity,
  ProcessInstanceStepRequirementEntity,
  ProcessInstanceStepTriggerEntity,
  ProcessTemplateEntity,
  ProcessTemplateCategoryEntity,
  ProcessTemplateDescriptionEntity,
  ProcessTemplateStepEntity,
  ProcessTemplateStepDescriptionEntity,
  ProcessTemplateStepRequirementSubmissionEntity,
  ProcessTemplateStepRequirementEntity,
  ProcessTemplateStepTriggerConditionSubmissionEntity,
  ProcessTemplateStepTriggerConditionEntity,
  ProjectEntity,
  ProjectMetaEntity,
  ProjectStepStatusMappingEntity,
  ProjectTaskStatusEntity,
  TaskAttachmentsEntity,
  TaskCommentsEntity,
  TaskEntity,
  TaskMetaEntity,
  TaskMentionsEntity,
  RoleDescriptionEntity,
  RolePermissionEntity,
  RoleEntity,
  ResourceEntity,
  ResourceAssignmentEntity,
  ResourceAssignmentShiftEntity,
  ResourceAvailabilityEntity,
  ResourceBlackoutDateEntity,
  ResourceMetaEntity,
  ScheduledTaskEntity,
  ScheduledTaskEventsEntity,
  ScheduledTaskHistoryEntity,
  TaskDependencyEntity,
  SystemLanguageEntity,
  SystemStatusEntity,
  SharedProjectEntity,
  SharedResourceEntity,
  SharedTaskEntity,
  SharingInvitationEntity,
  SharingLogEntity,
  TenantEntity,
  TenantBillingInfoEntity,
  TenantConfigurationsEntity,
  TenantContactInfoEntity,
  TenantMetaEntity,
  TenantOffDaysEntity,
  TenantSubscriptionEntity,
  TenantTeamEntity,
  TenantTeamMemberEntity,
  TenantTeamProjectEntity,
  TenantTypeEntity,
  TenantUsersEntity,
  TenantUserConfigurationsEntity,
  TenantUserInvitationsEntity,
  TenantUserMetaEntity,
  TenantUserOffDaysEntity,
  TenantUserRoleEntity,
  TenantUserWorkingHoursEntity,
  TenantWorkingHoursEntity,
  UserEntity,
  UserMetaEntity,
  UserNotificationPreferenceEntity,
  UserRoleEntity,
];

const OBJECT_TYPE_ALIASES: Record<string, string> = {
  category: 'categories',
  category_description: 'category_descriptions',
  customer: 'customers',
  customer_contact: 'customer_contact_info',
  customer_invitation: 'customer_invitations',
  event: 'events',
  event_log: 'event_logs',
  event_listener: 'event_listeners',
  notification: 'notifications',
  notification_channel: 'notification_channels',
  notification_template: 'notification_templates',
  notification_log: 'notification_logs',
  permission: 'permissions',
  process_template: 'process_templates',
  process_instance: 'process_instances',
  process_instance_step: 'process_instance_steps',
  project: 'projects',
  project_step_status_mapping: 'project_step_status_mappings',
  project_task_status: 'project_task_statuses',
  resource: 'resources',
  resource_assignment: 'resource_assignments',
  resource_blackout_date: 'resource_blackout_dates',
  role: 'roles',
  system_language: 'system_languages',
  system_status: 'system_statuses',
  task: 'tasks',
  task_attachment: 'task_attachments',
  task_comment: 'task_comments',
  task_mention: 'task_mentions',
  tenant: 'tenants',
  tenant_type: 'tenant_types',
  tenant_configuration: 'tenant_configurations',
  tenant_working_hour: 'tenant_working_hours',
  tenant_subscription: 'tenant_subscriptions',
  tenant_team: 'tenant_teams',
  tenant_off_day: 'tenant_off_days',
  tenant_user: 'tenant_users',
  tenant_user_invitation: 'tenant_user_invitations',
  user: 'users',
};

const CANONICAL_OBJECT_TYPE_BY_VARIANT = new Map<string, string>();
for (const [singular, plural] of Object.entries(OBJECT_TYPE_ALIASES)) {
  CANONICAL_OBJECT_TYPE_BY_VARIANT.set(singular, singular);
  CANONICAL_OBJECT_TYPE_BY_VARIANT.set(plural, singular);
}

function resolveTableNameForEntityClass(entityClass: Function): string | null {
  const table = getMetadataArgsStorage().tables.find(
    (tableMetadata) => tableMetadata.target === entityClass,
  );
  if (!table || typeof table.name !== 'string' || table.name.length === 0) {
    return null;
  }
  return table.name;
}

const OBJECT_TYPE_ENTITY_REGISTRY = new Map<string, Function>();
for (const entityClass of ENTITY_CLASSES) {
  const tableName = resolveTableNameForEntityClass(entityClass);
  if (!tableName) {
    continue;
  }
  OBJECT_TYPE_ENTITY_REGISTRY.set(tableName, entityClass);
}

export function resolveEntityClassForObjectType(
  objectType: string,
): Function | null {
  return (
    OBJECT_TYPE_ENTITY_REGISTRY.get(
      OBJECT_TYPE_ALIASES[objectType] ?? objectType,
    ) ?? null
  );
}

/**
 * Canonical object_type token used by config_objects row storage.
 * Canonical format is singular (e.g. `category` instead of `categories`).
 */
export function canonicalizeObjectType(objectType: string): string {
  const normalized = objectType.trim().toLowerCase();
  return CANONICAL_OBJECT_TYPE_BY_VARIANT.get(normalized) ?? normalized;
}

export function resolveObjectTypeForEntityClass(
  entityClass: Function,
): string | null {
  return resolveTableNameForEntityClass(entityClass);
}
