import { Injectable, Logger } from '@nestjs/common';
import type { EventEnvelope } from '../events/types';
import { PLATFORM_EVENT_NAMES } from '../events/constants/platform-event-names.constants';
import { NotificationRecipientResolverService } from '../events/notification-rules/notification-recipient-resolver.service';
import { TenantRecipientLookupService } from '../events/notification-rules/tenant-recipient-lookup.service';
import type { RecipientSpec } from '../events/notification-rules/recipient-spec.types';
import type { ProcessStepAssigneeResolveContext } from './process-step-assignee-spec.types';

/**
 * Resolves template assignee specs at step ready using process context
 * (mirrors {@link NotificationRecipientResolverService} for notification rules).
 */
@Injectable()
export class ProcessStepAssigneeResolverService {
  private readonly logger = new Logger(ProcessStepAssigneeResolverService.name);

  constructor(
    private readonly recipientResolver: NotificationRecipientResolverService,
    private readonly tenantLookup: TenantRecipientLookupService,
  ) {}

  /**
   * Resolves a spec to tenant-scoped `tenant_user_id` values for persistence.
   */
  async resolveTenantUserIds(
    spec: RecipientSpec,
    ctx: ProcessStepAssigneeResolveContext,
  ): Promise<number[]> {
    const actorUserId =
      ctx.actorUserId ??
      (ctx.actorTenantUserId
        ? await this.tenantLookup.findUserIdByTenantUserId(
            ctx.tenantId,
            ctx.actorTenantUserId,
          )
        : null);

    const envelope = this.buildEnvelope(ctx, actorUserId ?? undefined);
    const userIds = await this.recipientResolver.resolve(spec, envelope);

    if (userIds.length === 0) {
      return [];
    }

    const tenantUserIds = await this.tenantLookup.findTenantUserIdsByUserIds(
      ctx.tenantId,
      userIds,
    );

    if (tenantUserIds.length < userIds.length) {
      this.logger.warn(
        `Assignee spec resolved ${userIds.length} user(s) but only ${tenantUserIds.length} map to tenant ${ctx.tenantId} (step ${ctx.stepInstanceId})`,
      );
    }

    return tenantUserIds;
  }

  private buildEnvelope(
    ctx: ProcessStepAssigneeResolveContext,
    actorUserId?: number,
  ): EventEnvelope {
    return {
      eventName: PLATFORM_EVENT_NAMES.PROCESS_STEP_READY,
      tenantId: ctx.tenantId,
      userId: actorUserId,
      createdBy: ctx.actorTenantUserId,
      refs: {
        processInstanceId: ctx.processInstanceId,
        stepInstanceId: ctx.stepInstanceId,
      },
      data: {
        ...(ctx.context ?? {}),
        ...(ctx.subjectMetadata ?? {}),
        subjectType: ctx.subjectType,
        subjectId: ctx.subjectId,
        processInstanceId: ctx.processInstanceId,
        stepInstanceId: ctx.stepInstanceId,
      },
    };
  }
}
