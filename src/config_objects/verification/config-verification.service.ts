import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { applyJsonLogicRule } from '../../common/json-logic/json-logic-rule.util';
import { ConfigObjectsService } from '../config_objects.service';
import { ConfigObjectVerificationRuleEntity } from '../entities/config_object_verification_rule.entity';
import {
  buildDefaultVerifyEmailRule,
  CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
  type ConfigVerificationRuleDefinition,
  type ConfigVerificationRuleThen,
} from './config-verification.constants';
import { resolveEffectiveVerificationFieldMap } from './config-object-verification.util';
import { normalizeVerificationObjectType } from './config-object-verification-object-type.util';
import { buildUserVerifyEmailRule } from './user-verification.constants';
import { SystemTableVerificationService } from './system-table-verification.service';
import { ConfigVerificationRateLimitService } from './config-verification-rate-limit.service';
import { ConfigObjectVerificationAuditService } from './config-object-verification-audit.service';
import type { VerifyConfigObjectEmailResult } from '../interfaces/verify-config-object-email-result.interface';

export interface ExecuteConfigVerificationTriggerParams {
  trigger: string;
  objectType: string;
  tenantId?: number | null;
  input: Record<string, unknown>;
}

export interface ExecuteConfigVerificationTriggerResult {
  success: boolean;
  objectType: string;
  coreId?: number;
  emailVerified?: boolean;
  message?: string;
  changedFields?: string[];
}

@Injectable()
export class ConfigVerificationService {
  private readonly logger = new Logger(ConfigVerificationService.name);

  constructor(
    @InjectRepository(ConfigObjectVerificationRuleEntity)
    private readonly verificationRuleRepository: Repository<ConfigObjectVerificationRuleEntity>,
    private readonly configObjectsService: ConfigObjectsService,
    private readonly systemTableVerificationService: SystemTableVerificationService,
    private readonly rateLimitService: ConfigVerificationRateLimitService,
    private readonly verificationAuditService: ConfigObjectVerificationAuditService,
  ) {}

  /**
   * RPC entry point for generic config-object email verification (Phase 4).
   */
  async verifyConfigObjectEmail(params: {
    objectType: string;
    token: string;
    tenantId?: number | null;
    clientKey?: string | null;
  }): Promise<VerifyConfigObjectEmailResult> {
    const objectType = normalizeVerificationObjectType(params.objectType.trim());
    const token = params.token.trim();
    if (!token) {
      return this.failure(objectType, 'Verification token is required.');
    }

    const rateCheck = this.rateLimitService.checkAndRecord({
      objectType,
      token,
      clientKey: params.clientKey,
    });
    if (!rateCheck.allowed) {
      await this.verificationAuditService.record({
        objectType,
        tenantId: params.tenantId,
        outcome: 'rate_limited',
        failureReason: 'Too many verification attempts.',
        token,
        clientKey: params.clientKey,
      });
      return {
        success: false,
        objectType,
        rateLimited: true,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
        message: 'Too many verification attempts. Please try again later.',
      };
    }

    const result = await this.executeTrigger({
      trigger: CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL,
      objectType: params.objectType,
      tenantId: params.tenantId,
      input: { token },
    });

    await this.verificationAuditService.record({
      objectType,
      tenantId: params.tenantId,
      coreId: result.coreId,
      outcome: result.success ? 'success' : 'failure',
      failureReason: result.success ? null : result.message,
      token,
      clientKey: params.clientKey,
    });

    return result;
  }

  /**
   * @deprecated Prefer {@link verifyConfigObjectEmail} — audit/rate-limit wrappers apply there.
   * Executes a configured verification trigger for sor_bound or system_table objects.
   */
  async executeTrigger(
    params: ExecuteConfigVerificationTriggerParams,
  ): Promise<ExecuteConfigVerificationTriggerResult> {
    const objectType = normalizeVerificationObjectType(params.objectType.trim());
    const trigger = params.trigger.trim();
    const token = this.readVerificationToken(params.input);
    if (!token) {
      return this.failure(objectType, 'Verification token is required.');
    }

    const schema = await this.configObjectsService.getObjectSchema(
      params.tenantId,
      objectType,
    );
    if (!schema) {
      return this.failure(objectType, 'Configuration schema not found.');
    }

    const bindingMode = schema.configObject.bindingMode;
    if (bindingMode !== 'sor_bound' && bindingMode !== 'system_table') {
      throw new RpcException(
        'Verification triggers support sor_bound and system_table objects only.',
      );
    }

    const fieldMap = resolveEffectiveVerificationFieldMap(schema.configObject);
    const rule = await this.resolveRuleDefinition(
      schema.configObject.configObjectId,
      trigger,
      fieldMap,
      bindingMode,
      objectType,
    );
    if (!rule) {
      return this.failure(objectType, 'Verification rule is not configured.');
    }

    const lookup =
      bindingMode === 'system_table'
        ? await this.systemTableVerificationService.findByTokenField(
            objectType,
            fieldMap.tokenField,
            token,
            fieldMap,
          )
        : await this.configObjectsService.findSorBoundInstanceByMetaField({
            tenantId: params.tenantId,
            objectType,
            fieldKey: fieldMap.tokenField,
            fieldValue: token,
          });

    if (!lookup) {
      return this.failure(objectType, 'Invalid or expired verification token.');
    }

    const record = await this.resolveVerificationRecord(
      bindingMode,
      params,
      objectType,
      lookup,
    );

    const logicData = {
      record,
      input: params.input,
      now: new Date().toISOString(),
    };

    if (!applyJsonLogicRule(rule.when, logicData)) {
      return this.failure(
        objectType,
        'Invalid or expired verification token.',
        lookup.coreId,
      );
    }

    const then = this.parseThenJson(rule.then);
    const patchResult = await this.applyVerificationThenPatch(
      bindingMode,
      params,
      objectType,
      lookup.coreId,
      then.set,
      fieldMap,
    );

    const verifiedField = fieldMap.verifiedField;
    const emailVerified = patchResult.record[verifiedField] === true;

    this.logger.debug(
      `Verification trigger ${trigger} succeeded for ${objectType}:${lookup.coreId}`,
    );

    return {
      success: true,
      objectType,
      coreId: lookup.coreId,
      emailVerified,
      changedFields: patchResult.changedFields,
    };
  }

  private async resolveVerificationRecord(
    bindingMode: string,
    params: ExecuteConfigVerificationTriggerParams,
    objectType: string,
    lookup: {
      coreId: number;
      metaJson?: Record<string, unknown>;
      record?: Record<string, unknown>;
    },
  ): Promise<Record<string, unknown>> {
    if (bindingMode === 'system_table') {
      return lookup.record ?? {};
    }

    const resolved = await this.configObjectsService.resolveObjectInstance(
      params.tenantId,
      objectType,
      lookup.coreId,
    );
    if (resolved && 'dynamicFields' in resolved) {
      return resolved.dynamicFields as Record<string, unknown>;
    }
    return lookup.metaJson ?? {};
  }

  private async applyVerificationThenPatch(
    bindingMode: string,
    params: ExecuteConfigVerificationTriggerParams,
    objectType: string,
    coreId: number,
    set: Record<string, unknown>,
    fieldMap: ReturnType<typeof resolveEffectiveVerificationFieldMap>,
  ): Promise<{ record: Record<string, unknown>; changedFields: string[] }> {
    if (bindingMode === 'system_table') {
      return this.systemTableVerificationService.applyVerificationPatch({
        objectType,
        coreId,
        set,
        fieldMap,
      });
    }

    const patchResult =
      await this.configObjectsService.applySorBoundInstancePatch({
        tenantId: params.tenantId,
        objectType,
        coreId,
        metaPatch: set,
      });

    return {
      record: patchResult.metaJson,
      changedFields: Object.keys(set),
    };
  }

  private async resolveRuleDefinition(
    configObjectId: number,
    trigger: string,
    fieldMap: ReturnType<typeof resolveEffectiveVerificationFieldMap>,
    bindingMode: string,
    objectType: string,
  ): Promise<ConfigVerificationRuleDefinition | null> {
    const persisted = await this.verificationRuleRepository.findOne({
      where: {
        configObjectId,
        triggerKey: trigger,
        isActive: true,
      },
      order: { configObjectVerificationRuleId: 'ASC' },
    });

    if (persisted) {
      return {
        when: persisted.whenJson,
        then: this.parseThenJson(persisted.thenJson),
      };
    }

    if (trigger === CONFIG_VERIFICATION_TRIGGER_VERIFY_EMAIL) {
      if (bindingMode === 'system_table' && objectType === 'user') {
        return buildUserVerifyEmailRule(fieldMap);
      }
      return buildDefaultVerifyEmailRule(fieldMap);
    }

    return null;
  }

  private parseThenJson(raw: unknown): ConfigVerificationRuleThen {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new RpcException('Invalid verification rule then_json.');
    }

    const record = raw as Record<string, unknown>;
    const set = record.set;
    if (!set || typeof set !== 'object' || Array.isArray(set)) {
      throw new RpcException('Verification rule then_json requires a set object.');
    }

    return {
      set: set as Record<string, unknown>,
      ...(typeof record.emit === 'string' && record.emit.trim()
        ? { emit: record.emit.trim() }
        : {}),
    };
  }

  private readVerificationToken(input: Record<string, unknown>): string | null {
    const token = input.token;
    return typeof token === 'string' && token.trim() ? token.trim() : null;
  }

  private failure(
    objectType: string,
    message: string,
    coreId?: number,
  ): ExecuteConfigVerificationTriggerResult {
    return {
      success: false,
      objectType,
      ...(coreId != null ? { coreId } : {}),
      message,
    };
  }
}
