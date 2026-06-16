import { Injectable, Logger } from '@nestjs/common';
import { ConfigObjectsService } from '../../../config_objects/config_objects.service';
import type {
  NotificationBuildInput,
  NotificationBuildOptions,
  NotificationContext,
} from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';
import {
  shouldHydrateWorkflowNamespace,
} from '../notification-context-hydration.util';
import { pathStartsWith } from '../notification-context-path.util';
import { resolveProcessRef } from '../notification-process-ref.util';
import { NotificationProcessContextLoader } from '../notification-process-context.loader';
import {
  buildEntityFieldsFromResolvedInstance,
} from '../notification-entity-fields.util';
import { parseOptionalPositiveInt } from '../notification-context-source.util';

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

/**
 * Hydrates `workflow.*` from process instance context JSON (NV3).
 */
@Injectable()
export class WorkflowContextProvider {
  private readonly logger = new Logger(WorkflowContextProvider.name);

  constructor(
    private readonly processLoader: NotificationProcessContextLoader,
    private readonly configObjectsService: ConfigObjectsService,
  ) {}

  async apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
    input: NotificationBuildInput,
    options: NotificationBuildOptions = {},
  ): Promise<void> {
    if (!shouldHydrateWorkflowNamespace(options.requiredPaths)) {
      return;
    }

    const ref = resolveProcessRef(input, source);
    const payloadContext = asRecord(source.payload.context);
    const payloadWorkflowContext = asRecord(source.payload.workflowContext);

    let instanceContext: Record<string, unknown> = {};
    let subjectType: string | null = null;
    let subjectId: number | null = null;

    const processInstanceId =
      ref.processInstanceId ?? context.process.instanceId ?? null;

    if (processInstanceId) {
      const process = await this.processLoader.loadProcessInstance(
        processInstanceId,
      );
      if (process) {
        subjectType = process.subjectType ?? null;
        subjectId = process.subjectId ?? null;
        instanceContext = asRecord(process.context);
      }
    }

    context.workflow.subjectType = subjectType;
    context.workflow.subjectId = subjectId;
    context.workflow.context = {
      ...instanceContext,
      ...payloadContext,
      ...payloadWorkflowContext,
    };

    await this.maybeHydrateCustomerCrossRef(
      context,
      source,
      options.requiredPaths,
    );
  }

  private async maybeHydrateCustomerCrossRef(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
    requiredPaths?: string[],
  ): Promise<void> {
    if (!requiredPaths?.length || !source.tenantId) {
      return;
    }

    const needsCustomer = requiredPaths.some(
      (path) =>
        pathStartsWith(path, 'workflow.context.customer') ||
        path === 'workflow.context.customerId',
    );
    if (!needsCustomer) {
      return;
    }

    const customerId =
      parseOptionalPositiveInt(context.workflow.context.customerId) ??
      parseOptionalPositiveInt(context.workflow.context.customer_id);
    if (!customerId) {
      return;
    }

    try {
      const resolved = await this.configObjectsService.resolveObjectInstance(
        source.tenantId,
        'customer',
        customerId,
      );
      if (!resolved) {
        return;
      }

      context.workflow.context.customer = {
        coreId: customerId,
        objectType: 'customer',
        fields: buildEntityFieldsFromResolvedInstance(resolved),
      };
    } catch (error) {
      this.logger.warn(
        `Failed to hydrate workflow.context.customer for customerId=${customerId}`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
