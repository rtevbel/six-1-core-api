import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { UserService } from '../../users/users.service';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { TaskCommentsEntity } from '../../projects/tasks/comments/entities/comment.entity';
import { TaskAttachmentsEntity } from '../../projects/tasks/attachments/entities/attachment.entity';
import { TenantTeamEntity } from '../../tenants/tenant_teams/entities/tenant_team.entity';
import { NotificationUrlBuilderService } from './notification-url-builder.service';

/**
 * NotificationVariableResolverService
 *
 * Resolves template variables from event logs, users, and related entities.
 */
@Injectable()
export class NotificationVariableResolverService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly urlBuilder: NotificationUrlBuilderService,
  ) {}

  /**
   * Builds a variable map for template rendering.
   * @param eventLog - Event log containing payload and metadata.
   * @returns Variable map for template rendering.
   */
  async resolve(eventLog: EventLogEntity): Promise<Record<string, unknown>> {
    const variables: Record<string, unknown> = {
      ...(eventLog.payload && typeof eventLog.payload === 'object'
        ? eventLog.payload
        : {}),
    };

    this.setIfMissing(variables, 'eventName', eventLog.event?.name ?? null);
    this.setIfMissing(variables, 'eventId', eventLog.eventId);
    this.setIfMissing(variables, 'userId', eventLog.userId);
    this.setIfMissing(variables, 'entityId', eventLog.entityId ?? null);
    this.setIfMissing(variables, 'entityType', eventLog.entityType ?? null);
    this.setIfMissing(
      variables,
      'createdAt',
      eventLog.createdAt?.toISOString?.() ?? null,
    );

    await this.resolveActorAndRecipient(eventLog, variables);
    await this.resolveEntityDetails(eventLog, variables);

    return variables;
  }

  /**
   * Resolves actor and recipient user metadata.
   * @param eventLog - Event log containing user IDs.
   * @param variables - Variable map to enrich.
   */
  private async resolveActorAndRecipient(
    eventLog: EventLogEntity,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const actorId = eventLog.createdBy ?? eventLog.userId;
    const recipientId = eventLog.userId;

    const actor = await this.safeFindUser(actorId);
    if (actor) {
      this.setIfMissing(variables, 'actorId', actor.userId);
      this.setIfMissing(variables, 'actorName', this.getDisplayName(actor));
      this.setIfMissing(variables, 'actorEmail', actor.email);
    }

    const recipient = await this.safeFindUser(recipientId);
    if (recipient) {
      this.setIfMissing(variables, 'recipientId', recipient.userId);
      this.setIfMissing(
        variables,
        'recipientName',
        this.getDisplayName(recipient),
      );
      this.setIfMissing(variables, 'recipientEmail', recipient.email);
    }
  }

  /**
   * Resolves variables for related entities like project, task, comment, attachment.
   * @param eventLog - Event log containing entity details.
   * @param variables - Variable map to enrich.
   */
  private async resolveEntityDetails(
    eventLog: EventLogEntity,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const entityType = this.normalizeEntityType(eventLog.entityType);
    const entityId = eventLog.entityId ? Number(eventLog.entityId) : null;

    if (!entityType || !entityId) {
      return;
    }

    if (entityType === 'project') {
      await this.resolveProject(entityId, variables);
      return;
    }

    if (entityType === 'task') {
      await this.resolveTask(entityId, variables);
      return;
    }

    if (entityType === 'comment') {
      await this.resolveComment(entityId, variables);
      return;
    }

    if (entityType === 'attachment') {
      await this.resolveAttachment(entityId, variables);
      return;
    }

    if (entityType === 'team') {
      await this.resolveTeam(entityId, variables);
    }
  }

  /**
   * Resolves project variables.
   */
  private async resolveProject(
    projectId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(ProjectEntity);
    const project = await repo.findOne({ where: { projectId } });
    if (!project) return;

    this.setIfMissing(variables, 'projectId', project.projectId);
    this.setIfMissing(variables, 'projectName', project.name);
    this.setIfMissing(variables, 'projectIdentifier', project.projectIdentifier);
    this.setIfMissing(variables, 'tenantId', project.tenantId);
    this.setIfMissing(
      variables,
      'projectUrl',
      this.urlBuilder.buildProjectUrl(project.projectId),
    );
  }

  /**
   * Resolves task and related project variables.
   */
  private async resolveTask(
    taskId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskEntity);
    const task = await repo.findOne({ where: { taskId } });
    if (!task) return;

    this.setIfMissing(variables, 'taskId', task.taskId);
    this.setIfMissing(variables, 'taskName', task.name);
    this.setIfMissing(variables, 'taskIdentifier', task.taskIdentifier);
    this.setIfMissing(variables, 'projectId', task.projectId);
    this.setIfMissing(variables, 'priority', task.priority);
    this.setIfMissing(
      variables,
      'taskUrl',
      this.urlBuilder.buildTaskUrl(task.taskId),
    );

    if (task.projectId) {
      await this.resolveProject(task.projectId, variables);
    }
  }

  /**
   * Resolves comment and related task variables.
   */
  private async resolveComment(
    commentId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskCommentsEntity);
    const comment = await repo.findOne({ where: { commentId } });
    if (!comment) return;

    this.setIfMissing(variables, 'commentId', comment.commentId);
    this.setIfMissing(
      variables,
      'commentSnippet',
      comment.comment?.slice(0, 140) ?? null,
    );
    this.setIfMissing(variables, 'taskId', comment.taskId);
    if (comment.taskId) {
      this.setIfMissing(
        variables,
        'commentUrl',
        this.urlBuilder.buildCommentUrl(comment.taskId, comment.commentId),
      );
    }

    if (comment.taskId) {
      await this.resolveTask(comment.taskId, variables);
    }
  }

  /**
   * Resolves attachment and related task/comment variables.
   */
  private async resolveAttachment(
    attachmentId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskAttachmentsEntity);
    const attachment = await repo.findOne({ where: { attachmentId } });
    if (!attachment) return;

    this.setIfMissing(variables, 'fileName', attachment.fileName);
    this.setIfMissing(variables, 'filePath', attachment.filePath);
    this.setIfMissing(variables, 'fileType', attachment.fileType);
    this.setIfMissing(variables, 'fileSize', attachment.fileSize);

    if (attachment.commentId) {
      await this.resolveComment(attachment.commentId, variables);
    }
    if (attachment.taskId) {
      await this.resolveTask(attachment.taskId, variables);
    }
  }

  /**
   * Resolves team variables.
   */
  private async resolveTeam(
    teamId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TenantTeamEntity);
    const team = await repo.findOne({ where: { tenantTeamId: teamId } });
    if (!team) return;

    this.setIfMissing(variables, 'teamId', team.tenantTeamId);
    this.setIfMissing(variables, 'teamName', team.name);
    this.setIfMissing(variables, 'teamIdentifier', team.teamIdentifier);
    this.setIfMissing(variables, 'tenantId', team.tenantId);
    this.setIfMissing(
      variables,
      'teamUrl',
      this.urlBuilder.buildTeamUrl(team.tenantTeamId),
    );
  }

  /**
   * Normalizes entity type into a simple lower-case name.
   */
  private normalizeEntityType(entityType?: string | null): string | null {
    if (!entityType) return null;
    return entityType.toLowerCase().replace(/entity$/, '');
  }

  /**
   * Sets a variable only if it's missing or empty.
   */
  private setIfMissing(
    variables: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (variables[key] === undefined || variables[key] === null) {
      variables[key] = value;
    }
  }

  /**
   * Resolves a display name for a user.
   */
  private getDisplayName(user: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  }): string {
    if (user.displayName) return user.displayName;
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (fullName) return fullName;
    return user.username ?? user.email ?? 'User';
  }

  /**
   * Safely fetches a user by ID.
   */
  private async safeFindUser(userId?: number): Promise<any | null> {
    if (!userId) return null;
    try {
      return await this.userService.findOne(userId, userId);
    } catch (error) {
      return null;
    }
  }
}
