/**
 * Notes:
 * - Common keys you'll reuse often:
 *   projectId, projectName, projectIdentifier, projectUrl, tenantId, tenantName,
 *   taskId, taskIdentifier, taskName, taskUrl, priority, dueDateISO, dueDateHuman,
 *   actorId, actorName, actorEmail, recipientId, recipientName, recipientEmail.
 * - Keep URLs consistent: projectUrl/taskUrl/commentUrl/milestoneUrl.
 * - For SMS, prefer also providing taskShortUrl/commentShortUrl.
 */

export const EventVars = {
  /* ========= COMMON DIGESTS / SYSTEM ========= */
  daily_digest: {
    required: ['recipientName', 'dateISO'],
    optional: [
      'projectsSummary',
      'tasksDueCount',
      'overdueCount',
      'unreadCommentsCount',
      'digestUrl',
      'tenantName',
    ],
  },
  weekly_summary: {
    required: ['recipientName', 'weekStartISO', 'weekEndISO'],
    optional: [
      'projectsSummary',
      'completedTasksCount',
      'newTasksCount',
      'digestUrl',
      'tenantName',
    ],
  },

  /* ========= PROJECT LIFECYCLE ========= */
  project_created: {
    required: [
      'projectId',
      'projectName',
      'projectIdentifier',
      'projectUrl',
      'actorName',
    ],
    optional: ['tenantId', 'tenantName', 'description'],
  },
  project_updated: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: ['changedFields', 'oldValuesJson', 'newValuesJson'],
  },
  project_archived: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: ['archivedAt'],
  },
  project_restored: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: ['restoredAt'],
  },
  project_member_added: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
      'memberName',
      'memberId',
    ],
    optional: ['roleName'],
  },
  project_member_removed: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
      'memberName',
      'memberId',
    ],
    optional: ['roleName'],
  },
  project_due_set: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
      'dueDateISO',
    ],
    optional: ['dueDateHuman'],
  },
  project_due_changed: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
      'oldDueDateISO',
      'newDueDateISO',
    ],
    optional: ['oldDueDateHuman', 'newDueDateHuman'],
  },
  project_due_removed: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: [],
  },
  project_status_changed: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
      'oldStatus',
      'newStatus',
    ],
    optional: [],
  },
  project_shared: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: ['sharedWithName'],
  },
  project_unshared: {
    required: ['projectId', 'projectName', 'projectUrl', 'actorName'],
    optional: ['unsharedWithName'],
  },

  /* ========= TASK LIFECYCLE ========= */
  task_created: {
    required: [
      'taskId',
      'taskIdentifier',
      'taskName',
      'taskUrl',
      'projectId',
      'projectName',
      'actorName',
    ],
    optional: [
      'assigneeName',
      'priority',
      'dueDateISO',
      'dueDateHuman',
      'description',
    ],
  },
  task_assigned: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'assigneeName',
      'actorName',
    ],
    optional: ['priority', 'dueDateISO', 'dueDateHuman'],
  },
  task_unassigned: {
    required: ['taskId', 'taskName', 'taskUrl', 'projectName', 'actorName'],
    optional: [],
  },
  task_reassigned: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'oldAssigneeName',
      'newAssigneeName',
      'actorName',
    ],
    optional: [],
  },
  task_status_changed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'oldStatus',
      'newStatus',
      'actorName',
    ],
    optional: [],
  },
  task_priority_changed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'oldPriority',
      'newPriority',
      'actorName',
    ],
    optional: [],
  },
  task_due_set: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'dueDateISO',
      'actorName',
    ],
    optional: ['dueDateHuman'],
  },
  task_due_changed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'oldDueDateISO',
      'newDueDateISO',
      'actorName',
    ],
    optional: ['oldDueDateHuman', 'newDueDateHuman'],
  },
  task_due_removed: {
    required: ['taskId', 'taskName', 'taskUrl', 'projectName', 'actorName'],
    optional: [],
  },
  task_overdue: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'assigneeName',
      'dueDateISO',
    ],
    optional: ['dueDateHuman', 'taskShortUrl'],
  },
  task_due_reminder: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'assigneeName',
      'dueDateHuman',
    ],
    optional: ['taskShortUrl'],
  },
  task_completed: {
    required: ['taskId', 'taskName', 'taskUrl', 'projectName', 'actorName'],
    optional: ['completedAt'],
  },
  task_reopened: {
    required: ['taskId', 'taskName', 'taskUrl', 'projectName', 'actorName'],
    optional: [],
  },
  task_deleted: {
    required: ['taskId', 'taskName', 'projectName', 'actorName'],
    optional: [],
  },
  task_restored: {
    required: ['taskId', 'taskName', 'taskUrl', 'projectName', 'actorName'],
    optional: [],
  },
  task_moved_project: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'oldProjectName',
      'newProjectName',
      'actorName',
    ],
    optional: [],
  },
  task_estimate_set: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'estimateHours',
      'actorName',
    ],
    optional: [],
  },
  task_estimate_changed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'oldEstimateHours',
      'newEstimateHours',
      'actorName',
    ],
    optional: [],
  },
  task_dependency_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'dependsOnTaskName',
      'dependsOnTaskUrl',
      'actorName',
    ],
    optional: [],
  },
  task_dependency_removed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'dependsOnTaskName',
      'dependsOnTaskUrl',
      'actorName',
    ],
    optional: [],
  },
  task_tag_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'tagName',
      'actorName',
    ],
    optional: [],
  },
  task_tag_removed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'tagName',
      'actorName',
    ],
    optional: [],
  },
  task_custom_field_set: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'fieldName',
      'value',
      'actorName',
    ],
    optional: [],
  },
  task_custom_field_changed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'fieldName',
      'oldValue',
      'newValue',
      'actorName',
    ],
    optional: [],
  },
  task_custom_field_cleared: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'fieldName',
      'actorName',
    ],
    optional: [],
  },

  /* ========= COMMENTS / ATTACHMENTS / MENTIONS ========= */
  comment_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'commentId',
      'commenterName',
      'commentUrl',
    ],
    optional: ['commentSnippet', 'mentionedNames'],
  },
  comment_edited: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'commentId',
      'commenterName',
      'commentUrl',
    ],
    optional: ['oldSnippet', 'newSnippet'],
  },
  comment_deleted: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'commentId',
      'commenterName',
      'actorName',
    ],
    optional: [],
  },
  user_mentioned: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'commentId',
      'commenterName',
      'mentionedName',
      'commentUrl',
    ],
    optional: [],
  },
  attachment_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'fileName',
      'fileUrl',
      'actorName',
    ],
    optional: ['fileSizeHuman'],
  },
  attachment_removed: {
    required: ['taskId', 'taskName', 'projectName', 'fileName', 'actorName'],
    optional: [],
  },
  follower_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'followerName',
      'actorName',
    ],
    optional: [],
  },
  follower_removed: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'followerName',
      'actorName',
    ],
    optional: [],
  },

  /* ========= SUBTASKS / CHECKLIST ========= */
  subtask_created: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'subtaskId',
      'subtaskName',
      'subtaskUrl',
      'actorName',
    ],
    optional: [],
  },
  subtask_completed: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'subtaskId',
      'subtaskName',
      'actorName',
    ],
    optional: [],
  },
  checklist_item_added: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'checklistItemId',
      'checklistItemText',
      'actorName',
    ],
    optional: [],
  },
  checklist_item_completed: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'checklistItemId',
      'checklistItemText',
      'actorName',
    ],
    optional: [],
  },
  checklist_item_uncompleted: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'checklistItemId',
      'checklistItemText',
      'actorName',
    ],
    optional: [],
  },
  checklist_item_removed: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'checklistItemId',
      'checklistItemText',
      'actorName',
    ],
    optional: [],
  },

  /* ========= WORKFLOW / PROCESS TEMPLATE & STEPS ========= */
  process_template_applied: {
    required: [
      'projectId',
      'projectName',
      'projectUrl',
      'processTemplateId',
      'processTemplateName',
      'actorName',
    ],
    optional: [],
  },
  process_step_task_created: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'taskUrl',
      'stepOrder',
      'stepName',
      'actorName',
    ],
    optional: [],
  },
  process_step_started: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'taskUrl',
      'stepOrder',
      'stepName',
      'actorName',
    ],
    optional: [],
  },
  process_step_completed: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'taskUrl',
      'stepOrder',
      'stepName',
      'actorName',
    ],
    optional: [],
  },
  process_requirement_submitted: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'requirementType',
      'requirementKey',
      'submittedByName',
      'submittedAt',
    ],
    optional: ['submissionId'],
  },
  process_requirement_approved: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'requirementKey',
      'reviewerName',
      'reviewedAt',
    ],
    optional: ['submissionId'],
  },
  process_requirement_rejected: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'requirementKey',
      'reviewerName',
      'reviewedAt',
    ],
    optional: ['rejectionReason', 'submissionId'],
  },
  process_trigger_condition_submission_created: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'conditionType',
      'conditionKey',
      'submittedByName',
      'submittedAt',
    ],
    optional: ['submissionId'],
  },
  process_trigger_condition_satisfied: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'conditionType',
      'conditionKey',
      'satisfiedAt',
    ],
    optional: ['submissionId'],
  },
  process_step_approval_requested: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'requestedByName',
      'requestedAt',
    ],
    optional: [],
  },
  process_step_approval_approved: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'approverName',
      'approvedAt',
    ],
    optional: [],
  },
  process_step_approval_rejected: {
    required: [
      'projectId',
      'projectName',
      'taskId',
      'taskName',
      'stepName',
      'approverName',
      'rejectedAt',
    ],
    optional: ['rejectionReason'],
  },

  /* ========= TEAMS / MEMBERS ========= */
  team_created: {
    required: ['teamId', 'teamName', 'actorName'],
    optional: ['teamUrl', 'tenantName'],
  },
  team_member_added: {
    required: ['teamId', 'teamName', 'memberName', 'actorName'],
    optional: ['roleName', 'teamUrl'],
  },
  team_member_removed: {
    required: ['teamId', 'teamName', 'memberName', 'actorName'],
    optional: ['roleName'],
  },
  team_added_to_project: {
    required: [
      'teamId',
      'teamName',
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
    ],
    optional: [],
  },
  team_removed_from_project: {
    required: [
      'teamId',
      'teamName',
      'projectId',
      'projectName',
      'projectUrl',
      'actorName',
    ],
    optional: [],
  },

  /* ========= MILESTONES / SPRINTS ========= */
  milestone_created: {
    required: [
      'projectId',
      'projectName',
      'milestoneId',
      'milestoneName',
      'actorName',
    ],
    optional: ['dueDateISO', 'dueDateHuman', 'milestoneUrl'],
  },
  milestone_completed: {
    required: [
      'projectId',
      'projectName',
      'milestoneId',
      'milestoneName',
      'actorName',
    ],
    optional: ['completedAt'],
  },
  sprint_started: {
    required: [
      'projectId',
      'projectName',
      'sprintId',
      'sprintName',
      'startDateISO',
      'endDateISO',
      'actorName',
    ],
    optional: [],
  },
  sprint_completed: {
    required: [
      'projectId',
      'projectName',
      'sprintId',
      'sprintName',
      'actorName',
    ],
    optional: ['completedAt'],
  },

  /* ========= TIME TRACKING ========= */
  time_logged: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'userName',
      'hours',
      'loggedAt',
    ],
    optional: ['note'],
  },
  time_entry_updated: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'userName',
      'oldHours',
      'newHours',
      'updatedAt',
    ],
    optional: ['note'],
  },
  time_entry_deleted: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'userName',
      'hours',
      'deletedAt',
    ],
    optional: [],
  },

  /* ========= INTEGRATIONS (examples) ========= */
  integration_github_commit_linked: {
    required: [
      'taskId',
      'taskName',
      'taskUrl',
      'projectName',
      'repo',
      'commitSha',
      'commitUrl',
      'actorName',
    ],
    optional: ['commitMessage'],
  },
  integration_ci_build_passed: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'pipelineName',
      'buildNumber',
      'buildUrl',
      'completedAt',
    ],
    optional: [],
  },
  integration_ci_build_failed: {
    required: [
      'taskId',
      'taskName',
      'projectName',
      'pipelineName',
      'buildNumber',
      'buildUrl',
      'completedAt',
    ],
    optional: ['failureReason'],
  },
} as const;
