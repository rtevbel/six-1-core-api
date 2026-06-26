import { Injectable } from '@nestjs/common';
import { ConfigObjectsService } from '../config_objects.service';
import { resolveEffectiveVerificationFieldMap } from './config-object-verification.util';
import { normalizeVerificationObjectType } from './config-object-verification-object-type.util';
import { generateVerificationToken } from './generate-verification-token.util';
import { SystemTableVerificationService } from './system-table-verification.service';
import { DEFAULT_VERIFICATION_TTL_HOURS } from './config-object-verification.constants';

export interface IssueConfigObjectVerificationTokenParams {
  objectType: string;
  coreId: number;
  tenantId?: number | null;
  ttlHours?: number;
  clearVerifiedBeforeIssue?: boolean;
}

export interface IssueConfigObjectVerificationTokenResult {
  objectType: string;
  coreId: number;
  token: string;
  expiresAt: string;
}

/**
 * Shared primitive for issuing verification tokens (sor_bound meta or system_table user).
 */
@Injectable()
export class ConfigObjectVerificationTokenService {
  constructor(
    private readonly configObjectsService: ConfigObjectsService,
    private readonly systemTableVerificationService: SystemTableVerificationService,
  ) {}

  async issueVerificationToken(
    params: IssueConfigObjectVerificationTokenParams,
  ): Promise<IssueConfigObjectVerificationTokenResult> {
    const objectType = normalizeVerificationObjectType(params.objectType);
    const schema = await this.configObjectsService.getObjectSchema(
      params.tenantId,
      objectType,
    );
    if (!schema) {
      throw new Error(`No config schema for object type "${objectType}"`);
    }

    const fieldMap = resolveEffectiveVerificationFieldMap(schema.configObject);
    const ttlHours =
      params.ttlHours ??
      fieldMap.defaultTtlHours ??
      DEFAULT_VERIFICATION_TTL_HOURS;

    if (schema.configObject.bindingMode === 'system_table') {
      const issued = await this.systemTableVerificationService.issueVerificationToken(
        {
          objectType,
          coreId: params.coreId,
          ttlHours,
          fieldMap,
          clearVerifiedBeforeIssue: params.clearVerifiedBeforeIssue,
        },
      );
      return {
        objectType,
        coreId: issued.coreId,
        token: issued.token,
        expiresAt: issued.expiresAt,
      };
    }

    if (schema.configObject.bindingMode !== 'sor_bound') {
      throw new Error(
        `issueVerificationToken does not support binding_mode ${schema.configObject.bindingMode}`,
      );
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(
      Date.now() + ttlHours * 60 * 60 * 1000,
    ).toISOString();
    const metaPatch: Record<string, unknown> = {
      [fieldMap.tokenField]: token,
      [fieldMap.expiresAtField]: expiresAt,
    };
    if (params.clearVerifiedBeforeIssue !== false) {
      metaPatch[fieldMap.verifiedField] = false;
    }

    await this.configObjectsService.applySorBoundInstancePatch({
      tenantId: params.tenantId,
      objectType,
      coreId: params.coreId,
      metaPatch,
    });

    return {
      objectType,
      coreId: params.coreId,
      token,
      expiresAt,
    };
  }
}
