import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  NotificationBuildInput,
  NotificationBuildOptions,
  NotificationContext,
} from '../notification-context.types';
import type { NormalizedNotificationContextSource } from '../notification-context-source.util';
import { shouldHydrateProcessNamespace } from '../notification-context-hydration.util';
import { buildNotificationPublicUrl } from '../notification-public-url.util';
import { resolveProcessRef } from '../notification-process-ref.util';
import { NotificationProcessContextLoader } from '../notification-process-context.loader';

/**
 * Hydrates `process.*` from envelope payload and optional DB rows (NV3).
 */
@Injectable()
export class ProcessContextProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly processLoader: NotificationProcessContextLoader,
  ) {}

  async apply(
    context: NotificationContext,
    source: NormalizedNotificationContextSource,
    input: NotificationBuildInput,
    options: NotificationBuildOptions = {},
  ): Promise<void> {
    const ref = resolveProcessRef(input, source);
    if (!ref.processInstanceId && !ref.stepInstanceId) {
      return;
    }

    this.applyPayloadRef(context, ref);

    if (!shouldHydrateProcessNamespace(options.requiredPaths)) {
      this.applyRunnerUrl(context, ref.processInstanceId);
      return;
    }

    let processInstanceId = ref.processInstanceId;

    if (ref.stepInstanceId) {
      const step = await this.processLoader.loadStepInstance(ref.stepInstanceId);
      if (step) {
        context.process.stepInstanceId = step.stepInstanceId;
        context.process.stepName = step.name ?? context.process.stepName;
        context.process.stepOrder = step.stepOrder ?? context.process.stepOrder;
        context.process.status = step.status ?? context.process.status;
        processInstanceId = processInstanceId ?? step.processInstanceId;
      }
    }

    if (processInstanceId) {
      const process = await this.processLoader.loadProcessInstance(
        processInstanceId,
      );
      if (process) {
        context.process.instanceId = process.processInstanceId;
        context.process.templateId = process.processTemplateId;
        context.process.status = context.process.status ?? process.status;
        processInstanceId = process.processInstanceId;
      }
    }

    this.applyRunnerUrl(context, processInstanceId);
  }

  private applyPayloadRef(
    context: NotificationContext,
    ref: ReturnType<typeof resolveProcessRef>,
  ): void {
    if (ref.processInstanceId) {
      context.process.instanceId = ref.processInstanceId;
    }
    if (ref.stepInstanceId) {
      context.process.stepInstanceId = ref.stepInstanceId;
    }
    if (ref.stepName) {
      context.process.stepName = ref.stepName;
    }
    if (ref.stepOrder != null) {
      context.process.stepOrder = ref.stepOrder;
    }
    if (ref.processTemplateId != null) {
      context.process.templateId = ref.processTemplateId;
    }
    if (ref.stepStatus) {
      context.process.status = ref.stepStatus;
    } else if (ref.processStatus) {
      context.process.status = ref.processStatus;
    }
  }

  private applyRunnerUrl(
    context: NotificationContext,
    processInstanceId: number | null | undefined,
  ): void {
    if (!processInstanceId) {
      return;
    }

    context.process.runnerUrl =
      buildNotificationPublicUrl(
        this.configService,
        `/process-instances/${processInstanceId}/runner`,
      ) ?? null;
  }
}
