import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventLogEntity } from '../../events/event_logs/entities/event_log.entity';
import { UserService } from '../../users/users.service';
import { parseOptionalPositiveInt } from '../context/notification-context-source.util';
import { ConfigObjectVariableProvider } from '../context/providers/config-object-variable.provider';
import {
  LEGACY_SOR_ENTITY_FIELD_MAPS,
  LEGACY_SOR_ENTITY_TYPES,
} from '../context/legacy-sor-field-maps.constants';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { TaskEntity } from '../../projects/tasks/entities/task.entity';
import { TaskCommentsEntity } from '../../projects/tasks/comments/entities/comment.entity';
import { TaskAttachmentsEntity } from '../../projects/tasks/attachments/entities/attachment.entity';
import { TenantTeamEntity } from '../../tenants/tenant_teams/entities/tenant_team.entity';
import { NotificationUrlBuilderService } from './notification-url-builder.service';

/**
 * Legacy flat-key variable resolver for templates when NV context flag is off.
 * Sor-bound entities delegate to {@link ConfigObjectVariableProvider} (NV6.3).
 */
@Injectable()
export class NotificationVariableResolverService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userService: UserService,
    private readonly urlBuilder: NotificationUrlBuilderService,
    private readonly configObjectVariableProvider: ConfigObjectVariableProvider,
  ) {}

  /**
   * Builds a variable map for template rendering.
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

  private async resolveEntityDetails(
    eventLog: EventLogEntity,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const entityType = this.normalizeEntityType(eventLog.entityType);
    const entityId = eventLog.entityId ? Number(eventLog.entityId) : null;

    if (!entityType || !entityId) {
      return;
    }

    if (LEGACY_SOR_ENTITY_TYPES.has(entityType)) {
      await this.resolveSorBoundEntity(entityType, entityId, variables);
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
   * Delegates sor_bound hydration to {@link ConfigObjectVariableProvider}; falls back to TypeORM for project/task.
   */
  private async resolveSorBoundEntity(
    objectType: string,
    coreId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const tenantId = this.resolveTenantId(variables);
    const legacyFieldMap = LEGACY_SOR_ENTITY_FIELD_MAPS[objectType];

    if (tenantId && legacyFieldMap) {
      const hydrated =
        await this.configObjectVariableProvider.hydrateLegacyFlatVariables(
          variables,
          tenantId,
          objectType,
          coreId,
          legacyFieldMap,
        );

      if (hydrated) {
        this.setIfMissing(variables, 'tenantId', tenantId);
        this.applySorBoundUrls(objectType, coreId, variables);
        if (objectType === 'task') {
          const projectId = parseOptionalPositiveInt(variables.projectId);
          if (projectId) {
            await this.resolveSorBoundEntity('project', projectId, variables);
          }
        }
        return;
      }
    }

    if (objectType === 'project') {
      await this.resolveProjectFromRepository(coreId, variables);
      return;
    }

    if (objectType === 'task') {
      await this.resolveTaskFromRepository(coreId, variables);
    }
  }

  private applySorBoundUrls(
    objectType: string,
    coreId: number,
    variables: Record<string, unknown>,
  ): void {
    if (objectType === 'project') {
      this.setIfMissing(
        variables,
        'projectUrl',
        this.urlBuilder.buildProjectUrl(coreId),
      );
      return;
    }

    if (objectType === 'task') {
      this.setIfMissing(
        variables,
        'taskUrl',
        this.urlBuilder.buildTaskUrl(coreId),
      );
    }
  }

  private async resolveProjectFromRepository(
    projectId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(ProjectEntity);
    const project = await repo.findOne({ where: { projectId } });
    if (!project) {
      return;
    }

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

  private async resolveTaskFromRepository(
    taskId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskEntity);
    const task = await repo.findOne({ where: { taskId } });
    if (!task) {
      return;
    }

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
      await this.resolveSorBoundEntity('project', task.projectId, variables);
    }
  }

  private async resolveComment(
    commentId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskCommentsEntity);
    const comment = await repo.findOne({ where: { commentId } });
    if (!comment) {
      return;
    }

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
      await this.resolveSorBoundEntity('task', comment.taskId, variables);
    }
  }

  private async resolveAttachment(
    attachmentId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TaskAttachmentsEntity);
    const attachment = await repo.findOne({ where: { attachmentId } });
    if (!attachment) {
      return;
    }

    this.setIfMissing(variables, 'fileName', attachment.fileName);
    this.setIfMissing(variables, 'filePath', attachment.filePath);
    this.setIfMissing(variables, 'fileType', attachment.fileType);
    this.setIfMissing(variables, 'fileSize', attachment.fileSize);

    if (attachment.commentId) {
      await this.resolveComment(attachment.commentId, variables);
    }
    if (attachment.taskId) {
      await this.resolveSorBoundEntity('task', attachment.taskId, variables);
    }
  }

  private async resolveTeam(
    teamId: number,
    variables: Record<string, unknown>,
  ): Promise<void> {
    const repo = this.dataSource.getRepository(TenantTeamEntity);
    const team = await repo.findOne({ where: { tenantTeamId: teamId } });
    if (!team) {
      return;
    }

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

  private resolveTenantId(variables: Record<string, unknown>): number | null {
    return parseOptionalPositiveInt(variables.tenantId);
  }

  private normalizeEntityType(entityType?: string | null): string | null {
    if (!entityType) {
      return null;
    }
    return entityType.toLowerCase().replace(/entity$/, '');
  }

  private setIfMissing(
    variables: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (variables[key] === undefined || variables[key] === null) {
      variables[key] = value;
    }
  }

  private getDisplayName(user: {
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
  }): string {
    if (user.displayName) {
      return user.displayName;
    }
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (fullName) {
      return fullName;
    }
    return user.username ?? user.email ?? 'User';
  }

  private async safeFindUser(userId?: number): Promise<any | null> {
    if (!userId) {
      return null;
    }
    try {
      return await this.userService.findOne(userId, userId);
    } catch {
      return null;
    }
  }
}
