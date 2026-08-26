import { CreateCategoryDescriptionDto } from '../../categories/dto/create-category-description.dto';
import { CreateCategoryDto } from '../../categories/dto/create-category.dto';
import { UpdateCategoryDescriptionDto } from '../../categories/dto/update-category-description.dto';
import { UpdateCategoryDto } from '../../categories/dto/update-category.dto';
import { CreateCustomerContactInfoDto } from '../../customers/customer_contact_info/dto/create-customer_contact_info.dto';
import { CreateCustomerContactInfoMetaDto } from '../../customers/customer_contact_info/dto/create-customer_contact_info_meta.dto';
import { CreateCustomerInvitationDto } from '../../customers/customer_invitations/dto/create-customer_invitation.dto';
import { UpdateCustomerContactInfoDto } from '../../customers/customer_contact_info/dto/update-customer_contact_info.dto';
import { UpdateCustomerContactInfoMetaDto } from '../../customers/customer_contact_info/dto/update-customer_contact_info_meta.dto';
import { UpdateCustomerInvitationDto } from '../../customers/customer_invitations/dto/update-customer_invitation.dto';
import { CreateCustomerDto } from '../../customers/dto/create-customer.dto';
import { CreateCustomerMetaDto } from '../../customers/dto/create-customer_meta.dto';
import { UpdateCustomerDto } from '../../customers/dto/update-customer.dto';
import { UpdateCustomerMetaDto } from '../../customers/dto/update-customer_meta.dto';
import { CreateEventListenerDto } from '../../events/event_listeners/dto/create-event_listener.dto';
import { UpdateEventListenerDto } from '../../events/event_listeners/dto/update-event_listener.dto';
import { CreateEventLogDto } from '../../events/event_logs/dto/create-event_log.dto';
import { UpdateEventLogDto } from '../../events/event_logs/dto/update-event_log.dto';
import { CreateEventDto } from '../../events/dto/create-event.dto';
import { UpdateEventDto } from '../../events/dto/update-event.dto';
import { CreateEventNotificationRuleDto } from '../../events/event_notification_rules/dto/create-event_notification_rule.dto';
import { UpdateEventNotificationRuleDto } from '../../events/event_notification_rules/dto/update-event_notification_rule.dto';
import { CreateActionBindingDto } from '../../events/platform-actions/dto/create-action_binding.dto';
import { UpdateActionBindingDto } from '../../events/platform-actions/dto/update-action_binding.dto';
import { CreatePlatformActionDto } from '../../events/platform-actions/dto/create-platform_action.dto';
import { UpdatePlatformActionDto } from '../../events/platform-actions/dto/update-platform_action.dto';
import { CreateNotificationChannelDto } from '../../notifications/notification_channels/dto/create-notification_channel.dto';
import { UpdateNotificationChannelDto } from '../../notifications/notification_channels/dto/update-notification_channel.dto';
import { CreateNotificationLogDto } from '../../notifications/notification_logs/dto/create-notification_log.dto';
import { UpdateNotificationLogDto } from '../../notifications/notification_logs/dto/update-notification_log.dto';
import { CreateNotificationTemplateDto } from '../../notifications/notification_templates/dto/create-notification_template.dto';
import { UpdateNotificationTemplateDto } from '../../notifications/notification_templates/dto/update-notification_template.dto';
import { CreateNotificationDto } from '../../notifications/dto/create-notification.dto';
import { UpdateNotificationDto } from '../../notifications/dto/update-notification.dto';
import { CreatePermissionDto } from '../../permissions/dto/create-permission.dto';
import { UpdatePermissionDto } from '../../permissions/dto/update-permission.dto';
import { CreateProcessInstanceDto } from '../../process_instances/dto/create-process_instance.dto';
import { UpdateProcessInstanceDto } from '../../process_instances/dto/update-process_instance.dto';
import { CreateProcessInstanceStepDto } from '../../process_instances/process_instance_steps/dto/create-process_instance_step.dto';
import { UpdateProcessInstanceStepDto } from '../../process_instances/process_instance_steps/dto/update-process_instance_step.dto';
import { CreateProcessTemplateDto } from '../../process_templates/dto/create-process_template.dto';
import { UpdateProcessTemplateDto } from '../../process_templates/dto/update-process_template.dto';
import { CreateProjectDto } from '../../projects/dto/create-project.dto';
import { CreateProjectMetaDto } from '../../projects/dto/create-project_meta.dto';
import { CreateProjectStepStatusMappingDto } from '../../projects/dto/create-project-step-status-mapping.dto';
import { UpdateProjectDto } from '../../projects/dto/update-project.dto';
import { UpdateProjectMetaDto } from '../../projects/dto/update-project_meta.dto';
import { UpdateProjectStepStatusMappingDto } from '../../projects/dto/update-project-step-status-mapping.dto';
import { CreateProjectTaskStatusDto } from '../../projects/project_task_statuses/dto/create-project_task_status.dto';
import { UpdateProjectTaskStatusDto } from '../../projects/project_task_statuses/dto/update-project_task_status.dto';
import { CreateTaskAttachmentDto } from '../../projects/tasks/attachments/dto/create-attachment.dto';
import { UpdateTaskAttachmentDto } from '../../projects/tasks/attachments/dto/update-attachment.dto';
import { CreateTaskCommentDto } from '../../projects/tasks/comments/dto/create-comment.dto';
import { UpdateTaskCommentDto } from '../../projects/tasks/comments/dto/update-comment.dto';
import { CreateTaskMentionDto } from '../../projects/tasks/mentions/dto/create-mention.dto';
import { UpdateTaskMentionDto } from '../../projects/tasks/mentions/dto/update-mention.dto';
import { CreateTaskDto } from '../../projects/tasks/dto/create-task.dto';
import { CreateTaskMetaDto } from '../../projects/tasks/dto/create-task_meta.dto';
import { UpdateTaskDto } from '../../projects/tasks/dto/update-task.dto';
import { UpdateTaskMetaDto } from '../../projects/tasks/dto/update-task_meta.dto';
import { CreateRoleDto } from '../../roles/dto/create-role.dto';
import { UpdateRoleDto } from '../../roles/dto/update-role.dto';
import { CreateResourceDto } from '../../scheduler/dto/create-resource.dto';
import { CreateResourceAssignmentDto } from '../../scheduler/dto/create-resource-assignment.dto';
import { CreateResourceAssignmentShiftDto } from '../../scheduler/dto/create-resource_assignment_shift.dto';
import { CreateResourceAvailabilityDto } from '../../scheduler/dto/create-resource-availability.dto';
import { CreateResourceBlackoutDateDto } from '../../scheduler/dto/create-resource-blackout-date.dto';
import { CreateResourceMetaDto } from '../../scheduler/dto/create-resource_meta.dto';
import { CreateScheduledTaskDto } from '../../scheduler/dto/create-scheduled_task.dto';
import { CreateScheduledTaskEventDto } from '../../scheduler/dto/create-scheduled_task_event.dto';
import { CreateScheduledTaskHistoryDto } from '../../scheduler/dto/create-scheduled_task_history.dto';
import { CreateTaskDependencyDto } from '../../scheduler/dto/create-task_dependency.dto';
import { UpdateResourceDto } from '../../scheduler/dto/update-resource.dto';
import { UpdateResourceAssignmentDto } from '../../scheduler/dto/update-resource-assignment.dto';
import { UpdateResourceAssignmentShiftDto } from '../../scheduler/dto/update-resource_assignment_shift.dto';
import { UpdateResourceAvailabilityDto } from '../../scheduler/dto/update-resource-availability.dto';
import { UpdateResourceBlackoutDateDto } from '../../scheduler/dto/update-resource-blackout-date.dto';
import { UpdateResourceMetaDto } from '../../scheduler/dto/update-resource_meta.dto';
import { UpdateScheduledTaskDto } from '../../scheduler/dto/update-scheduled_task.dto';
import { UpdateScheduledTaskEventDto } from '../../scheduler/dto/update-scheduled_task_event.dto';
import { UpdateScheduledTaskHistoryDto } from '../../scheduler/dto/update-scheduled_task_history.dto';
import { UpdateTaskDependencyDto } from '../../scheduler/dto/update-task_dependency.dto';
import { CreateSystemLanguageDto } from '../../settings/system_languages/dto/create-system-language.dto';
import { UpdateSystemLanguageDto } from '../../settings/system_languages/dto/update-system-language.dto';
import { CreateSystemStatusDto } from '../../settings/system_statuses/dto/create-system-status.dto';
import { UpdateSystemStatusDto } from '../../settings/system_statuses/dto/update-system-status.dto';
import { CreateTenantDto } from '../../tenants/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../tenants/dto/update-tenant.dto';
import { CreateTenantBillingInfoDto } from '../../tenants/tenant_billing_info/dto/create-tenant_billing_info.dto';
import { UpdateTenantBillingInfoDto } from '../../tenants/tenant_billing_info/dto/update-tenant_billing_info.dto';
import { CreateTenantConfigurationsDto } from '../../tenants/tenant_configurations/dto/create-tenant_configuration.dto';
import { UpdateTenantConfigurationsDto } from '../../tenants/tenant_configurations/dto/update-tenant_configuration.dto';
import { CreateTenantContactInfoDto } from '../../tenants/tenant_contact_info/dto/create-tenant_contact_info.dto';
import { UpdateTenantContactInfoDto } from '../../tenants/tenant_contact_info/dto/update-tenant_contact_info.dto';
import { CreateTenantOffDaysDto } from '../../tenants/tenant_off_days/dto/create-tenant_off_day.dto';
import { UpdateTenantOffDaysDto } from '../../tenants/tenant_off_days/dto/update-tenant_off_day.dto';
import { CreateTenantSubscriptionDto } from '../../tenants/tenant_subscriptions/dto/create-tenant_subscription.dto';
import { UpdateTenantSubscriptionDto } from '../../tenants/tenant_subscriptions/dto/update-tenant_subscription.dto';
import { CreateTenantTeamDto } from '../../tenants/tenant_teams/dto/create-tenant_team.dto';
import { UpdateTenantTeamDto } from '../../tenants/tenant_teams/dto/update-tenant_team.dto';
import { CreateTenantTeamMemberDto } from '../../tenants/tenant_teams/tenant_team_members/dto/create-tenant_team_member.dto';
import { UpdateTenantTeamMemberDto } from '../../tenants/tenant_teams/tenant_team_members/dto/update-tenant_team_member.dto';
import { CreateTenantTeamProjectDto } from '../../tenants/tenant_teams/tenant_team_projects/dto/create-tenant_team_project.dto';
import { UpdateTenantTeamProjectDto } from '../../tenants/tenant_teams/tenant_team_projects/dto/update-tenant_team_project.dto';
import { CreateTenantTypeDto } from '../../tenants/tenant_types/dto/create-tenant_type.dto';
import { UpdateTenantTypeDto } from '../../tenants/tenant_types/dto/update-tenant_type.dto';
import { CreateTenantUserDto } from '../../tenants/tenant_users/dto/create-tenant_user.dto';
import { UpdateTenantUserDto } from '../../tenants/tenant_users/dto/update-tenant_user.dto';
import { CreateTenantUserMetaDto } from '../../tenants/tenant_users/tenant_user_meta/dto/create-tenant_user_meta.dto';
import { CreateTenantUserInvitationDto } from '../../tenants/tenant_users/tenant_user_invitations/dto/create-tenant_user_invitation.dto';
import { UpdateTenantUserMetaDto } from '../../tenants/tenant_users/tenant_user_meta/dto/update-tenant_user_meta.dto';
import { UpdateTenantUserInvitationDto } from '../../tenants/tenant_users/tenant_user_invitations/dto/update-tenant_user_invitation.dto';
import { CreateTenantWorkingHoursDto } from '../../tenants/tenant_working_hours/dto/create-tenant_working_hour.dto';
import { UpdateTenantWorkingHoursDto } from '../../tenants/tenant_working_hours/dto/update-tenant_working_hour.dto';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { CreateUserNotificationPreferenceDto } from '../../users/user-notification-preferences/dto/create-user-notification-preference.dto';
import { UpdateUserDto } from '../../users/dto/update-user.dto';
import { UpdateUserNotificationPreferenceDto } from '../../users/user-notification-preferences/dto/update-user-notification-preference.dto';
import { CreateSharedProjectDto } from '../../sharing/dto/shared-projects/create-shared-project.dto';
import { UpdateSharedProjectDto } from '../../sharing/dto/shared-projects/update-shared-project.dto';
import { CreateSharedResourceDto } from '../../sharing/dto/shared-resources/create-shared-resource.dto';
import { UpdateSharedResourceDto } from '../../sharing/dto/shared-resources/update-shared-resource.dto';
import { CreateSharedTaskDto } from '../../sharing/dto/shared-tasks/create-shared-task.dto';
import { UpdateSharedTaskDto } from '../../sharing/dto/shared-tasks/update-shared-task.dto';
import { CreateSharingInvitationDto } from '../../sharing/dto/sharing-invitations/create-sharing-invitation.dto';
import { UpdateSharingInvitationDto } from '../../sharing/dto/sharing-invitations/update-sharing-invitation.dto';
import { CreateSharingLogDto } from '../../sharing/dto/sharing-logs/create-sharing-log.dto';
import { UpdateSharingLogDto } from '../../sharing/dto/sharing-logs/update-sharing-log.dto';

export interface ObjectTypeDtoPair {
  createDto?: Function;
  updateDto?: Function;
}

const OBJECT_TYPE_DTO_REGISTRY: Record<string, ObjectTypeDtoPair> = {
  category: { createDto: CreateCategoryDto, updateDto: UpdateCategoryDto },
  categories: { createDto: CreateCategoryDto, updateDto: UpdateCategoryDto },
  category_description: {
    createDto: CreateCategoryDescriptionDto,
    updateDto: UpdateCategoryDescriptionDto,
  },
  category_descriptions: {
    createDto: CreateCategoryDescriptionDto,
    updateDto: UpdateCategoryDescriptionDto,
  },
  project: { createDto: CreateProjectDto, updateDto: UpdateProjectDto },
  projects: { createDto: CreateProjectDto, updateDto: UpdateProjectDto },
  project_step_status_mapping: {
    createDto: CreateProjectStepStatusMappingDto,
    updateDto: UpdateProjectStepStatusMappingDto,
  },
  project_step_status_mappings: {
    createDto: CreateProjectStepStatusMappingDto,
    updateDto: UpdateProjectStepStatusMappingDto,
  },
  project_task_status: {
    createDto: CreateProjectTaskStatusDto,
    updateDto: UpdateProjectTaskStatusDto,
  },
  project_task_statuses: {
    createDto: CreateProjectTaskStatusDto,
    updateDto: UpdateProjectTaskStatusDto,
  },
  task: { createDto: CreateTaskDto, updateDto: UpdateTaskDto },
  tasks: { createDto: CreateTaskDto, updateDto: UpdateTaskDto },
  task_comment: {
    createDto: CreateTaskCommentDto,
    updateDto: UpdateTaskCommentDto,
  },
  task_comments: {
    createDto: CreateTaskCommentDto,
    updateDto: UpdateTaskCommentDto,
  },
  task_attachment: {
    createDto: CreateTaskAttachmentDto,
    updateDto: UpdateTaskAttachmentDto,
  },
  task_attachments: {
    createDto: CreateTaskAttachmentDto,
    updateDto: UpdateTaskAttachmentDto,
  },
  task_mention: {
    createDto: CreateTaskMentionDto,
    updateDto: UpdateTaskMentionDto,
  },
  task_mentions: {
    createDto: CreateTaskMentionDto,
    updateDto: UpdateTaskMentionDto,
  },
  customer: { createDto: CreateCustomerDto, updateDto: UpdateCustomerDto },
  customers: { createDto: CreateCustomerDto, updateDto: UpdateCustomerDto },
  customer_contact: {
    createDto: CreateCustomerContactInfoDto,
    updateDto: UpdateCustomerContactInfoDto,
  },
  customer_contact_info: {
    createDto: CreateCustomerContactInfoDto,
    updateDto: UpdateCustomerContactInfoDto,
  },
  customer_invitation: {
    createDto: CreateCustomerInvitationDto,
    updateDto: UpdateCustomerInvitationDto,
  },
  customer_invitations: {
    createDto: CreateCustomerInvitationDto,
    updateDto: UpdateCustomerInvitationDto,
  },
  resource: { createDto: CreateResourceDto, updateDto: UpdateResourceDto },
  resources: { createDto: CreateResourceDto, updateDto: UpdateResourceDto },
  resource_assignment: {
    createDto: CreateResourceAssignmentDto,
    updateDto: UpdateResourceAssignmentDto,
  },
  resource_assignments: {
    createDto: CreateResourceAssignmentDto,
    updateDto: UpdateResourceAssignmentDto,
  },
  resource_availability: {
    createDto: CreateResourceAvailabilityDto,
    updateDto: UpdateResourceAvailabilityDto,
  },
  resource_blackout_date: {
    createDto: CreateResourceBlackoutDateDto,
    updateDto: UpdateResourceBlackoutDateDto,
  },
  resource_blackout_dates: {
    createDto: CreateResourceBlackoutDateDto,
    updateDto: UpdateResourceBlackoutDateDto,
  },
  notification: {
    createDto: CreateNotificationDto,
    updateDto: UpdateNotificationDto,
  },
  notifications: {
    createDto: CreateNotificationDto,
    updateDto: UpdateNotificationDto,
  },
  notification_channel: {
    createDto: CreateNotificationChannelDto,
    updateDto: UpdateNotificationChannelDto,
  },
  notification_channels: {
    createDto: CreateNotificationChannelDto,
    updateDto: UpdateNotificationChannelDto,
  },
  notification_template: {
    createDto: CreateNotificationTemplateDto,
    updateDto: UpdateNotificationTemplateDto,
  },
  notification_templates: {
    createDto: CreateNotificationTemplateDto,
    updateDto: UpdateNotificationTemplateDto,
  },
  notification_log: {
    createDto: CreateNotificationLogDto,
    updateDto: UpdateNotificationLogDto,
  },
  notification_logs: {
    createDto: CreateNotificationLogDto,
    updateDto: UpdateNotificationLogDto,
  },
  event: { createDto: CreateEventDto, updateDto: UpdateEventDto },
  events: { createDto: CreateEventDto, updateDto: UpdateEventDto },
  event_log: {
    createDto: CreateEventLogDto,
    updateDto: UpdateEventLogDto,
  },
  event_logs: {
    createDto: CreateEventLogDto,
    updateDto: UpdateEventLogDto,
  },
  event_listener: {
    createDto: CreateEventListenerDto,
    updateDto: UpdateEventListenerDto,
  },
  event_listeners: {
    createDto: CreateEventListenerDto,
    updateDto: UpdateEventListenerDto,
  },
  user: { createDto: CreateUserDto, updateDto: UpdateUserDto },
  users: { createDto: CreateUserDto, updateDto: UpdateUserDto },
  roles: { createDto: CreateRoleDto, updateDto: UpdateRoleDto },
  role: { createDto: CreateRoleDto, updateDto: UpdateRoleDto },
  permissions: { createDto: CreatePermissionDto, updateDto: UpdatePermissionDto },
  permission: { createDto: CreatePermissionDto, updateDto: UpdatePermissionDto },
  tenant: { createDto: CreateTenantDto, updateDto: UpdateTenantDto },
  tenants: { createDto: CreateTenantDto, updateDto: UpdateTenantDto },
  tenant_type: {
    createDto: CreateTenantTypeDto,
    updateDto: UpdateTenantTypeDto,
  },
  tenant_types: {
    createDto: CreateTenantTypeDto,
    updateDto: UpdateTenantTypeDto,
  },
  tenant_configuration: {
    createDto: CreateTenantConfigurationsDto,
    updateDto: UpdateTenantConfigurationsDto,
  },
  tenant_configurations: {
    createDto: CreateTenantConfigurationsDto,
    updateDto: UpdateTenantConfigurationsDto,
  },
  tenant_working_hour: {
    createDto: CreateTenantWorkingHoursDto,
    updateDto: UpdateTenantWorkingHoursDto,
  },
  tenant_working_hours: {
    createDto: CreateTenantWorkingHoursDto,
    updateDto: UpdateTenantWorkingHoursDto,
  },
  tenant_contact_info: {
    createDto: CreateTenantContactInfoDto,
    updateDto: UpdateTenantContactInfoDto,
  },
  tenant_billing_info: {
    createDto: CreateTenantBillingInfoDto,
    updateDto: UpdateTenantBillingInfoDto,
  },
  tenant_subscription: {
    createDto: CreateTenantSubscriptionDto,
    updateDto: UpdateTenantSubscriptionDto,
  },
  tenant_subscriptions: {
    createDto: CreateTenantSubscriptionDto,
    updateDto: UpdateTenantSubscriptionDto,
  },
  tenant_team: {
    createDto: CreateTenantTeamDto,
    updateDto: UpdateTenantTeamDto,
  },
  tenant_teams: {
    createDto: CreateTenantTeamDto,
    updateDto: UpdateTenantTeamDto,
  },
  team_member: {
    createDto: CreateTenantTeamMemberDto,
    updateDto: UpdateTenantTeamMemberDto,
  },
  tenant_team_member: {
    createDto: CreateTenantTeamMemberDto,
    updateDto: UpdateTenantTeamMemberDto,
  },
  tenant_team_members: {
    createDto: CreateTenantTeamMemberDto,
    updateDto: UpdateTenantTeamMemberDto,
  },
  team_project: {
    createDto: CreateTenantTeamProjectDto,
    updateDto: UpdateTenantTeamProjectDto,
  },
  tenant_team_project: {
    createDto: CreateTenantTeamProjectDto,
    updateDto: UpdateTenantTeamProjectDto,
  },
  tenant_team_projects: {
    createDto: CreateTenantTeamProjectDto,
    updateDto: UpdateTenantTeamProjectDto,
  },
  tenant_off_day: {
    createDto: CreateTenantOffDaysDto,
    updateDto: UpdateTenantOffDaysDto,
  },
  tenant_off_days: {
    createDto: CreateTenantOffDaysDto,
    updateDto: UpdateTenantOffDaysDto,
  },
  tenant_user: { createDto: CreateTenantUserDto, updateDto: UpdateTenantUserDto },
  tenant_users: { createDto: CreateTenantUserDto, updateDto: UpdateTenantUserDto },
  tenant_user_meta: {
    createDto: CreateTenantUserMetaDto,
    updateDto: UpdateTenantUserMetaDto,
  },
  tenant_user_invitation: {
    createDto: CreateTenantUserInvitationDto,
    updateDto: UpdateTenantUserInvitationDto,
  },
  tenant_user_invitations: {
    createDto: CreateTenantUserInvitationDto,
    updateDto: UpdateTenantUserInvitationDto,
  },
  user_notification_preference: {
    createDto: CreateUserNotificationPreferenceDto,
    updateDto: UpdateUserNotificationPreferenceDto,
  },
  user_notification_preferences: {
    createDto: CreateUserNotificationPreferenceDto,
    updateDto: UpdateUserNotificationPreferenceDto,
  },
  system_status: {
    createDto: CreateSystemStatusDto,
    updateDto: UpdateSystemStatusDto,
  },
  system_statuses: {
    createDto: CreateSystemStatusDto,
    updateDto: UpdateSystemStatusDto,
  },
  system_language: {
    createDto: CreateSystemLanguageDto,
    updateDto: UpdateSystemLanguageDto,
  },
  system_languages: {
    createDto: CreateSystemLanguageDto,
    updateDto: UpdateSystemLanguageDto,
  },
  process_template: {
    createDto: CreateProcessTemplateDto,
    updateDto: UpdateProcessTemplateDto,
  },
  process_templates: {
    createDto: CreateProcessTemplateDto,
    updateDto: UpdateProcessTemplateDto,
  },
  process_instance: {
    createDto: CreateProcessInstanceDto,
    updateDto: UpdateProcessInstanceDto,
  },
  process_instances: {
    createDto: CreateProcessInstanceDto,
    updateDto: UpdateProcessInstanceDto,
  },
  process_instance_step: {
    createDto: CreateProcessInstanceStepDto,
    updateDto: UpdateProcessInstanceStepDto,
  },
  process_instance_steps: {
    createDto: CreateProcessInstanceStepDto,
    updateDto: UpdateProcessInstanceStepDto,
  },
  event_notification_rule: {
    createDto: CreateEventNotificationRuleDto,
    updateDto: UpdateEventNotificationRuleDto,
  },
  event_notification_rules: {
    createDto: CreateEventNotificationRuleDto,
    updateDto: UpdateEventNotificationRuleDto,
  },
  platform_action: {
    createDto: CreatePlatformActionDto,
    updateDto: UpdatePlatformActionDto,
  },
  platform_actions: {
    createDto: CreatePlatformActionDto,
    updateDto: UpdatePlatformActionDto,
  },
  action_binding: {
    createDto: CreateActionBindingDto,
    updateDto: UpdateActionBindingDto,
  },
  action_bindings: {
    createDto: CreateActionBindingDto,
    updateDto: UpdateActionBindingDto,
  },
  customer_meta: {
    createDto: CreateCustomerMetaDto,
    updateDto: UpdateCustomerMetaDto,
  },
  customer_contact_info_meta: {
    createDto: CreateCustomerContactInfoMetaDto,
    updateDto: UpdateCustomerContactInfoMetaDto,
  },
  project_meta: {
    createDto: CreateProjectMetaDto,
    updateDto: UpdateProjectMetaDto,
  },
  task_meta: {
    createDto: CreateTaskMetaDto,
    updateDto: UpdateTaskMetaDto,
  },
  resource_meta: {
    createDto: CreateResourceMetaDto,
    updateDto: UpdateResourceMetaDto,
  },
  scheduled_tasks: {
    createDto: CreateScheduledTaskDto,
    updateDto: UpdateScheduledTaskDto,
  },
  scheduled_task_events: {
    createDto: CreateScheduledTaskEventDto,
    updateDto: UpdateScheduledTaskEventDto,
  },
  scheduled_task_history: {
    createDto: CreateScheduledTaskHistoryDto,
    updateDto: UpdateScheduledTaskHistoryDto,
  },
  task_dependencies: {
    createDto: CreateTaskDependencyDto,
    updateDto: UpdateTaskDependencyDto,
  },
  resource_assignment_shifts: {
    createDto: CreateResourceAssignmentShiftDto,
    updateDto: UpdateResourceAssignmentShiftDto,
  },
  shared_projects: {
    createDto: CreateSharedProjectDto,
    updateDto: UpdateSharedProjectDto,
  },
  shared_resources: {
    createDto: CreateSharedResourceDto,
    updateDto: UpdateSharedResourceDto,
  },
  shared_tasks: {
    createDto: CreateSharedTaskDto,
    updateDto: UpdateSharedTaskDto,
  },
  sharing_invitations: {
    createDto: CreateSharingInvitationDto,
    updateDto: UpdateSharingInvitationDto,
  },
  sharing_logs: {
    createDto: CreateSharingLogDto,
    updateDto: UpdateSharingLogDto,
  },
};

export function resolveDtoPairForObjectType(
  objectType: string,
): ObjectTypeDtoPair | null {
  return OBJECT_TYPE_DTO_REGISTRY[objectType] ?? null;
}
