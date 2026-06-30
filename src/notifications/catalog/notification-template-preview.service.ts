import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import type { EventEnvelope } from '../../events/types';
import { EventLogsService } from '../../events/event_logs/event_logs.service';
import { NotificationContextBuilderService } from '../context/notification-context-builder.service';
import { parseOptionalPositiveInt } from '../context/notification-context-source.util';
import { NotificationVariableResolverService } from '../services/notification-variable-resolver.service';
import {
  buildHandlebarsRenderView,
  findEmptyReferencedPaths,
} from '../template-engine/notification-legacy-context-shim.util';
import { NotificationTemplateEngineService } from '../template-engine/notification-template-engine.service';
import {
  extractRequiredTemplatePathsFromMany,
  extractTemplatePathsFromMany,
} from '../template-engine/template-ast-path-extractor';
import type { PreviewNotificationTemplateDto } from './dto/preview-notification-template.dto';
import type { PreviewNotificationTemplateResult } from './interfaces/preview-notification-template-result.interface';
import type { CatalogBuildOptions } from './notification-variable-catalog.service';
import { NotificationVariableCatalogService } from './notification-variable-catalog.service';
import { NotificationTemplateValidationService } from './notification-template-validation.service';

@Injectable()
export class NotificationTemplatePreviewService {
  constructor(
    private readonly templateEngine: NotificationTemplateEngineService,
    private readonly contextBuilder: NotificationContextBuilderService,
    private readonly variableResolver: NotificationVariableResolverService,
    private readonly eventLogsService: EventLogsService,
    private readonly validationService: NotificationTemplateValidationService,
    private readonly catalogService: NotificationVariableCatalogService,
  ) {}

  async preview(
    dto: PreviewNotificationTemplateDto,
  ): Promise<PreviewNotificationTemplateResult> {
    if (!dto.eventLogId && !dto.envelope) {
      throw new RpcException(
        'Provide either eventLogId or envelope for template preview.',
      );
    }

    const referencedPaths = extractTemplatePathsFromMany([
      dto.subject,
      dto.message,
    ]);
    const requiredPaths = extractRequiredTemplatePathsFromMany([
      dto.subject,
      dto.message,
    ]);

    if (dto.eventLogId) {
      return this.previewFromEventLog(dto, referencedPaths, requiredPaths);
    }

    return this.previewFromEnvelope(dto, referencedPaths, requiredPaths);
  }

  private async previewFromEventLog(
    dto: PreviewNotificationTemplateDto,
    referencedPaths: string[],
    requiredPaths: string[],
  ): Promise<PreviewNotificationTemplateResult> {
    const eventLog = await this.eventLogsService.findOne(
      dto.recipientUserId,
      dto.eventLogId as number,
    );
    const legacyFlat = await this.variableResolver.resolve(eventLog);
    const context = await this.contextBuilder.build(
      {
        source: {
          kind: 'event_log',
          eventLog,
          eventName: eventLog.event?.name,
        },
        recipientUserId: dto.recipientUserId,
        tenantId:
          dto.tenantId ??
          parseOptionalPositiveInt(eventLog.payload?.tenantId) ??
          parseOptionalPositiveInt(eventLog.payload?.tenant_id),
      },
      { requiredPaths: referencedPaths },
    );
    const view = buildHandlebarsRenderView(context, legacyFlat);
    const renderResult = this.templateEngine.render(
      dto.subject ?? null,
      dto.message,
      context,
      legacyFlat,
      requiredPaths,
    );

    const catalogOptions: CatalogBuildOptions = {
      tenantId:
        dto.tenantId ??
        parseOptionalPositiveInt(eventLog.payload?.tenantId) ??
        parseOptionalPositiveInt(eventLog.payload?.tenant_id) ??
        1,
      eventName: eventLog.event?.name ?? null,
    };

    return this.buildPreviewResult({
      renderResult,
      referencedPaths,
      requiredPaths,
      view,
      catalogOptions,
    });
  }

  private async previewFromEnvelope(
    dto: PreviewNotificationTemplateDto,
    referencedPaths: string[],
    requiredPaths: string[],
  ): Promise<PreviewNotificationTemplateResult> {
    const envelope = dto.envelope as EventEnvelope;
    const context = await this.contextBuilder.build(
      {
        source: { kind: 'envelope', envelope },
        recipientUserId: dto.recipientUserId,
        tenantId: dto.tenantId ?? parseOptionalPositiveInt(envelope.tenantId),
      },
      { requiredPaths: referencedPaths },
    );
    const view = buildHandlebarsRenderView(context);
    const renderResult = this.templateEngine.render(
      dto.subject ?? null,
      dto.message,
      context,
      undefined,
      requiredPaths,
    );

    const catalogOptions: CatalogBuildOptions = {
      tenantId: dto.tenantId ?? parseOptionalPositiveInt(envelope.tenantId) ?? 1,
      eventName: envelope.eventName,
    };

    return this.buildPreviewResult({
      renderResult,
      referencedPaths,
      requiredPaths,
      view,
      catalogOptions,
    });
  }

  private async buildPreviewResult(params: {
    renderResult: {
      subject: string | null;
      message: string;
      missingRequired: string[];
    };
    referencedPaths: string[];
    requiredPaths: string[];
    view: Record<string, unknown>;
    catalogOptions: CatalogBuildOptions;
  }): Promise<PreviewNotificationTemplateResult> {
    const catalog = await this.catalogService.buildCatalog(
      params.catalogOptions,
    );
    const unknownPaths = this.validationService.findUnknownPaths(
      params.referencedPaths,
      catalog.entries,
    );

    return {
      subject: params.renderResult.subject,
      message: params.renderResult.message,
      referencedPaths: params.referencedPaths,
      missingPaths: findEmptyReferencedPaths(
        params.view,
        params.requiredPaths,
      ),
      unknownPaths,
      missingRequired: params.renderResult.missingRequired,
    };
  }
}
