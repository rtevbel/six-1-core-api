import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EventEnvelope } from '../types';
import type { RecipientSpec, AssigneeRecipientSpec } from './recipient-spec.types';
import { ASSIGNEE_PAYLOAD_PATHS } from './recipient-spec.types';
import type { NotificationDeliveryTarget } from './notification-delivery-target.interface';
import { getByPath } from '../../notifications/context/notification-context-path.util';
import { TenantRecipientLookupService } from './tenant-recipient-lookup.service';
import { CustomerEntity } from '../../customers/entities/customer.entity';
import { parseOptionalPositiveInt } from '../../notifications/context/notification-context-source.util';

const EMAIL_PATH_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolves recipient platform `user_id` values from rule specs and envelopes (P3).
 */
@Injectable()
export class NotificationRecipientResolverService {
  private readonly logger = new Logger(NotificationRecipientResolverService.name);

  constructor(
    private readonly tenantLookup: TenantRecipientLookupService,
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async resolve(spec: RecipientSpec, envelope: EventEnvelope): Promise<number[]> {
    const targets = await this.resolveDeliveryTargets(spec, envelope);
    return [...new Set(targets.map((target) => target.userId))];
  }

  /**
   * Resolves delivery targets including direct email for workflow customers.
   */
  async resolveDeliveryTargets(
    spec: RecipientSpec,
    envelope: EventEnvelope,
  ): Promise<NotificationDeliveryTarget[]> {
    const tenantId = this.tenantLookup.resolveTenantId(envelope.tenantId);
    const fallbackUserId = this.resolveFallbackUserId(envelope);
    let targets: NotificationDeliveryTarget[];

    switch (spec.type) {
      case 'explicit_user_ids':
        targets = [...new Set(spec.userIds.filter((id) => id > 0))].map(
          (userId) => ({ userId }),
        );
        break;
      case 'event_actor': {
        const actor = envelope.userId ?? envelope.createdBy;
        targets =
          actor && Number(actor) > 0
            ? [{ userId: Number(actor) }]
            : [];
        break;
      }
      case 'event_payload_field':
        targets = await this.resolveEventPayloadFieldTargets(
          spec.path,
          envelope,
          fallbackUserId,
        );
        break;
      case 'workflow_customer_email':
        targets = await this.resolveWorkflowCustomerEmailTargets(
          envelope,
          fallbackUserId,
        );
        break;
      case 'assignee':
        targets = this.resolveAssigneeTargets(spec, envelope).map((userId) => ({
          userId,
        }));
        break;
      case 'tenant_role': {
        const userIds = await this.resolveTenantRole(spec, tenantId);
        targets = userIds.map((userId) => ({ userId }));
        break;
      }
      case 'tenant_admins': {
        const userIds = tenantId
          ? await this.tenantLookup.findTenantAdminUserIds(tenantId)
          : [];
        targets = userIds.map((userId) => ({ userId }));
        break;
      }
      default:
        targets = [];
    }

    if (tenantId && targets.length > 0) {
      const allowed = new Set(
        await this.tenantLookup.filterUserIdsToTenant(
          tenantId,
          targets.map((target) => target.userId),
        ),
      );
      targets = targets.filter((target) => allowed.has(target.userId));
    }

    const deduped = new Map<string, NotificationDeliveryTarget>();
    for (const target of targets) {
      const key = `${target.userId}:${target.destinationEmail ?? ''}`;
      deduped.set(key, target);
    }

    return [...deduped.values()];
  }

  private async resolveTenantRole(
    spec: Extract<RecipientSpec, { type: 'tenant_role' }>,
    tenantId: number | null,
  ): Promise<number[]> {
    if (!tenantId) {
      this.logger.warn('tenant_role recipient spec requires envelope tenantId');
      return [];
    }

    const permissions = [
      ...(Array.isArray(spec.permissions) ? spec.permissions : []),
      ...(spec.permission ? [spec.permission] : []),
    ]
      .map((name) => name.trim())
      .filter(Boolean);

    if (permissions.length > 0) {
      const nested = await Promise.all(
        [...new Set(permissions)].map((permission) =>
          this.tenantLookup.findUserIdsByPermission(tenantId, permission),
        ),
      );
      return [...new Set(nested.flat())];
    }

    const roleNames = [
      ...(Array.isArray(spec.roleNames) ? spec.roleNames : []),
      ...(spec.roleName ? [spec.roleName] : []),
    ]
      .map((name) => name.trim())
      .filter(Boolean);

    if (roleNames.length > 0) {
      const nested = await Promise.all(
        [...new Set(roleNames)].map((roleName) =>
          this.tenantLookup.findUserIdsByRoleName(tenantId, roleName),
        ),
      );
      return [...new Set(nested.flat())];
    }

    return [];
  }

  private resolveAssigneeTargets(
    spec: AssigneeRecipientSpec,
    envelope: EventEnvelope,
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

  private async resolveEventPayloadFieldTargets(
    path: string,
    envelope: EventEnvelope,
    fallbackUserId: number,
  ): Promise<NotificationDeliveryTarget[]> {
    const email = await this.resolveEmailFromEnvelopePath(envelope, path);
    if (email) {
      return [{ userId: fallbackUserId, destinationEmail: email }];
    }

    return this.resolvePayloadPath(envelope, path).map((userId) => ({ userId }));
  }

  private async resolveWorkflowCustomerEmailTargets(
    envelope: EventEnvelope,
    fallbackUserId: number,
  ): Promise<NotificationDeliveryTarget[]> {
    const customerId = this.resolveCustomerCoreId(envelope);
    if (!customerId) {
      return [];
    }

    const email = await this.loadCustomerEmail(customerId);
    if (!email) {
      return [];
    }

    return [{ userId: fallbackUserId, destinationEmail: email }];
  }

  private resolvePayloadPath(envelope: EventEnvelope, path: string): number[] {
    const value = this.readEnvelopeValue(envelope, path);

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

  private async resolveEmailFromEnvelopePath(
    envelope: EventEnvelope,
    path: string,
  ): Promise<string | null> {
    const direct = this.readEnvelopeScalar(envelope, path);
    if (this.isEmail(direct)) {
      return direct;
    }

    if (path === 'entity.fields.email' || path.endsWith('.fields.email')) {
      const customerId = this.resolveCustomerCoreId(envelope);
      if (customerId) {
        return this.loadCustomerEmail(customerId);
      }
    }

    return null;
  }

  private readEnvelopeValue(
    envelope: EventEnvelope,
    path: string,
  ): unknown {
    const roots = this.buildEnvelopeLookupRoots(envelope);
    for (const root of roots) {
      const value = getByPath(root, path);
      if (value != null && value !== '') {
        return value;
      }
    }
    return undefined;
  }

  private readEnvelopeScalar(
    envelope: EventEnvelope,
    path: string,
  ): string | null {
    const value = this.readEnvelopeValue(envelope, path);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private buildEnvelopeLookupRoots(
    envelope: EventEnvelope,
  ): Record<string, unknown>[] {
    const data = this.asRecord(envelope.data);
    const runtime = this.asRecord(data.runtime);
    const roots: Record<string, unknown>[] = [
      envelope as unknown as Record<string, unknown>,
      data,
      runtime,
      { ...data, ...runtime },
    ];

    const entity = this.asRecord(runtime.entity);
    if (Object.keys(entity).length > 0) {
      roots.push({ entity });
    }

    return roots;
  }

  private resolveCustomerCoreId(envelope: EventEnvelope): number | null {
    const refs = envelope.refs ?? {};
    const fromRefs = parseOptionalPositiveInt(refs.customerCoreId);
    if (fromRefs) {
      return fromRefs;
    }

    const data = this.asRecord(envelope.data);
    const runtime = this.asRecord(data.runtime);
    const context = {
      ...this.asRecord(data.context),
      ...this.asRecord(runtime.context),
      ...this.asRecord(data),
    };

    return (
      parseOptionalPositiveInt(context.customerId) ??
      parseOptionalPositiveInt(context.customer_id) ??
      parseOptionalPositiveInt(data.customerCoreId) ??
      parseOptionalPositiveInt(data.customer_core_id)
    );
  }

  private async loadCustomerEmail(customerId: number): Promise<string | null> {
    const customer = await this.customerRepository.findOne({
      where: { customerId },
      select: ['customerId', 'email'],
    });
    const email = customer?.email?.trim();
    return email && this.isEmail(email) ? email : null;
  }

  private resolveFallbackUserId(envelope: EventEnvelope): number {
    const actor = envelope.userId ?? envelope.createdBy;
    if (actor && Number(actor) > 0) {
      return Number(actor);
    }
    return 1;
  }

  private isEmail(value: string | null | undefined): value is string {
    return typeof value === 'string' && EMAIL_PATH_PATTERN.test(value.trim());
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
