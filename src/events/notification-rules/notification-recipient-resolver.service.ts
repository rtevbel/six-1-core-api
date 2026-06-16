import { Injectable, Logger } from '@nestjs/common';
import type { EventEnvelope } from '../types';
import type { RecipientSpec, AssigneeRecipientSpec } from './recipient-spec.types';
import { ASSIGNEE_PAYLOAD_PATHS } from './recipient-spec.types';
import { getByPath } from '../../notifications/context/notification-context-path.util';
import { TenantRecipientLookupService } from './tenant-recipient-lookup.service';

/**
 * Resolves recipient platform `user_id` values from rule specs and envelopes (P3).
 */
@Injectable()
export class NotificationRecipientResolverService {
  private readonly logger = new Logger(NotificationRecipientResolverService.name);

  constructor(
    private readonly tenantLookup: TenantRecipientLookupService,
  ) {}

  async resolve(spec: RecipientSpec, envelope: EventEnvelope): Promise<number[]> {
    const tenantId = this.tenantLookup.resolveTenantId(envelope.tenantId);
    let userIds: number[];

    switch (spec.type) {
      case 'explicit_user_ids':
        userIds = [...new Set(spec.userIds.filter((id) => id > 0))];
        break;
      case 'event_actor': {
        const actor = envelope.userId ?? envelope.createdBy;
        userIds = actor && Number(actor) > 0 ? [Number(actor)] : [];
        break;
      }
      case 'event_payload_field':
        userIds = this.resolvePayloadPath(envelope, spec.path);
        break;
      case 'assignee':
        userIds = this.resolveAssignee(envelope, spec);
        break;
      case 'tenant_role':
        userIds = await this.resolveTenantRole(spec, tenantId);
        break;
      case 'tenant_admins':
        userIds = tenantId
          ? await this.tenantLookup.findTenantAdminUserIds(tenantId)
          : [];
        break;
      default:
        userIds = [];
    }

    if (tenantId && userIds.length > 0) {
      userIds = await this.tenantLookup.filterUserIdsToTenant(tenantId, userIds);
    }

    return [...new Set(userIds)];
  }

  private async resolveTenantRole(
    spec: Extract<RecipientSpec, { type: 'tenant_role' }>,
    tenantId: number | null,
  ): Promise<number[]> {
    if (!tenantId) {
      this.logger.warn('tenant_role recipient spec requires envelope tenantId');
      return [];
    }

    if (spec.permission) {
      return this.tenantLookup.findUserIdsByPermission(
        tenantId,
        spec.permission,
      );
    }

    if (spec.roleName) {
      return this.tenantLookup.findUserIdsByRoleName(tenantId, spec.roleName);
    }

    return [];
  }

  private resolveAssignee(
    envelope: EventEnvelope,
    spec: AssigneeRecipientSpec,
  ): number[] {
    if (spec.path) {
      return this.resolvePayloadPath(envelope, spec.path);
    }

    for (const path of ASSIGNEE_PAYLOAD_PATHS) {
      const ids = this.resolvePayloadPath(envelope, path);
      if (ids.length > 0) {
        return ids;
      }
    }

    return [];
  }

  private resolvePayloadPath(envelope: EventEnvelope, path: string): number[] {
    const value = getByPath(
      envelope as unknown as Record<string, unknown>,
      path,
    );

    if (Array.isArray(value)) {
      return [
        ...new Set(
          value
            .map((entry) => Number(entry))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ];
    }

    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? [id] : [];
  }
}
