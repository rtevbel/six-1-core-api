import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigObjectsService } from '../config_objects/config_objects.service';
import { getNotificationPublicBaseUrl } from '../notifications/context/notification-public-url.util';
import { DEFAULT_VERIFICATION_TTL_HOURS } from '../config_objects/verification/config-object-verification.constants';
import { buildConfigObjectVerificationUrl } from '../config_objects/verification/config-object-verification-url.util';
import { generateVerificationToken } from '../config_objects/verification/generate-verification-token.util';
import { resolveEffectiveVerificationFieldMap } from '../config_objects/verification/config-object-verification.util';
import {
  buildProcessStepActionRuntimeContext,
  resolveOptionalCustomerIdFromRuntime,
  resolvePositiveIntFromPath,
  type ProcessStepActionEnvelopeParams,
} from './process-step-action-envelope.util';
import type { GenerateVerificationTokenActionConfig } from './process-step-action.types';

/**
 * Issues a verification token on a sor_bound config object meta row (Phase 2).
 */
@Injectable()
export class ProcessStepGenerateVerificationTokenService {
  constructor(
    private readonly configObjectsService: ConfigObjectsService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    config: GenerateVerificationTokenActionConfig,
    envelopeParams: ProcessStepActionEnvelopeParams,
  ): Promise<Record<string, unknown>> {
    const runtimeContext = buildProcessStepActionRuntimeContext(envelopeParams);
    const coreId = resolvePositiveIntFromPath(
      runtimeContext,
      config.coreIdPath,
    );
    if (coreId == null) {
      throw new Error(
        `coreIdPath "${config.coreIdPath}" did not resolve to a positive integer`,
      );
    }

    const objectType = config.objectType.trim();
    const schema = await this.configObjectsService.getObjectSchema(
      envelopeParams.tenantId,
      objectType,
    );
    if (!schema) {
      throw new Error(`No config schema for object type "${objectType}"`);
    }
    if (schema.configObject.bindingMode !== 'sor_bound') {
      throw new Error(
        'generate_verification_token currently supports sor_bound objects only',
      );
    }

    const fieldMap = resolveEffectiveVerificationFieldMap(schema.configObject);
    const tokenField = config.tokenField?.trim() || fieldMap.tokenField;
    const expiresAtField =
      config.expiresAtField?.trim() || fieldMap.expiresAtField;
    const verifiedField =
      config.verifiedField?.trim() || fieldMap.verifiedField;
    const ttlHours =
      config.ttlHours ??
      fieldMap.defaultTtlHours ??
      DEFAULT_VERIFICATION_TTL_HOURS;

    const token = generateVerificationToken();
    const expiresAt = new Date(
      Date.now() + ttlHours * 60 * 60 * 1000,
    ).toISOString();

    const metaPatch: Record<string, unknown> = {
      [tokenField]: token,
      [expiresAtField]: expiresAt,
    };
    if (config.clearVerifiedBeforeIssue !== false) {
      metaPatch[verifiedField] = false;
    }

    const customerId =
      objectType !== 'customer' && objectType.startsWith('customer_')
        ? resolveOptionalCustomerIdFromRuntime(runtimeContext)
        : undefined;

    const patchResult =
      await this.configObjectsService.applySorBoundInstancePatch({
        tenantId: envelopeParams.tenantId,
        objectType,
        coreId,
        metaPatch,
        customerId,
      });

    const verifyUrl = buildConfigObjectVerificationUrl(
      getNotificationPublicBaseUrl(this.configService),
      objectType,
      token,
    );

    return {
      objectType,
      coreId,
      token,
      expiresAt,
      verifyUrl,
      metaJson: patchResult.metaJson,
    };
  }
}
