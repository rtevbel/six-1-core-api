import { Injectable } from '@nestjs/common';
import {
  createEmptyNotificationContext,
  type NotificationBuildInput,
  type NotificationBuildOptions,
  type NotificationContext,
} from './notification-context.types';
import { normalizeNotificationContextSource } from './notification-context-source.util';
import { BuiltinNamespaceProvider } from './providers/builtin-namespace.provider';
import { ActorRecipientProvider } from './providers/actor-recipient.provider';
import { TenantContextProvider } from './providers/tenant-context.provider';
import { NotificationUrlsContextProvider } from './providers/notification-urls-context.provider';
import { ConfigObjectVariableProvider } from './providers/config-object-variable.provider';
import { ProcessContextProvider } from './providers/process-context.provider';
import { WorkflowContextProvider } from './providers/workflow-context.provider';
import { NotificationProcessContextLoader } from './notification-process-context.loader';

/**
 * Assembles {@link NotificationContext} for Handlebars notification templates (NV1+).
 */
@Injectable()
export class NotificationContextBuilderService {
  constructor(
    private readonly builtinProvider: BuiltinNamespaceProvider,
    private readonly actorRecipientProvider: ActorRecipientProvider,
    private readonly tenantProvider: TenantContextProvider,
    private readonly processProvider: ProcessContextProvider,
    private readonly workflowProvider: WorkflowContextProvider,
    private readonly urlsProvider: NotificationUrlsContextProvider,
    private readonly configObjectProvider: ConfigObjectVariableProvider,
  ) {}

  /**
   * Builds a context document from an event envelope or event log.
   * Entity hydration is lazy via `options.requiredPaths` (NV2+).
   */
  async build(
    input: NotificationBuildInput,
    options: NotificationBuildOptions = {},
  ): Promise<NotificationContext> {
    const context = createEmptyNotificationContext();
    const source = normalizeNotificationContextSource(input);

    this.builtinProvider.apply(context, source);
    await this.actorRecipientProvider.apply(context, source);
    await this.tenantProvider.apply(context, source);
    await this.processProvider.apply(context, source, input, options);
    await this.workflowProvider.apply(context, source, input, options);
    this.urlsProvider.apply(context, source, input.refs);
    await this.configObjectProvider.apply(context, source, input, options);
    this.applyEntityRecipientFallback(context);
    this.urlsProvider.applyVerificationUrl(context, source);

    return context;
  }

  private applyEntityRecipientFallback(context: NotificationContext): void {
    if (context.recipient.email) {
      return;
    }

    const fields = context.entity.fields;
    if (!fields || typeof fields !== 'object') {
      return;
    }

    const email =
      typeof fields.email === 'string' && fields.email.trim()
        ? fields.email.trim()
        : null;
    if (!email) {
      return;
    }

    context.recipient.email = email;
    const firstName =
      typeof fields.firstName === 'string' ? fields.firstName.trim() : '';
    const lastName =
      typeof fields.lastName === 'string' ? fields.lastName.trim() : '';
    const name = [firstName, lastName].filter(Boolean).join(' ');
    context.recipient.name =
      name ||
      (typeof context.entity.displayLabel === 'string'
        ? context.entity.displayLabel
        : null);
  }
}
