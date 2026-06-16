import { Injectable } from '@nestjs/common';
import { ConfigObjectsService } from './config_objects.service';
import {
  buildCompletenessFieldSnapshot,
  type ConfigObjectResolutionMode,
} from './config-object-completeness-fields.util';
import {
  evaluateCompletionRule,
  evaluateCoreLinkedCompletionRule,
  type CompletionRuleEvaluation,
} from './completion-rule.util';

export type CompletenessFieldSnapshot = {
  fields: Record<string, unknown>;
  status?: string;
};

export type EvaluateBindingCompletionParams = {
  tenantId: number;
  objectType: string;
  resolutionMode: ConfigObjectResolutionMode;
  completionRule: Record<string, unknown> | null | undefined;
  coreId?: number;
  instanceId?: number;
  /** Pre-built snapshot when the caller already resolved the instance. */
  snapshot?: CompletenessFieldSnapshot;
};

/**
 * H2 — Reusable binding / process-action completeness checks across
 * `standalone`, `sor_bound`, and `system_table` resolution modes.
 *
 * `system_table` evaluates completion rules against SoR core columns only
 * (no meta / designer custom fields).
 */
@Injectable()
export class ConfigObjectCompletenessService {
  constructor(private readonly configObjectsService: ConfigObjectsService) {}

  /**
   * Resolves the field snapshot used for completion_rule evaluation.
   */
  async buildFieldSnapshot(params: {
    tenantId: number;
    objectType: string;
    resolutionMode: ConfigObjectResolutionMode;
    coreId?: number;
    instanceId?: number;
  }): Promise<CompletenessFieldSnapshot | null> {
    const { tenantId, objectType, resolutionMode, coreId, instanceId } = params;

    if (resolutionMode === 'system_table') {
      if (typeof coreId !== 'number' || coreId < 1) {
        return null;
      }
      const core = await this.configObjectsService.loadCoreRecord(
        objectType,
        coreId,
      );
      if (!core) {
        return null;
      }
      return {
        fields: buildCompletenessFieldSnapshot('system_table', {
          objectType,
          core,
        }),
      };
    }

    if (resolutionMode === 'standalone') {
      if (typeof instanceId !== 'number' || instanceId < 1) {
        return null;
      }
      const resolved = await this.configObjectsService.resolveObjectInstance(
        tenantId,
        objectType,
        undefined,
        instanceId,
      );
      if (!resolved || resolved.resolutionMode !== 'standalone') {
        return null;
      }
      const instance =
        await this.configObjectsService.getCustomObjectInstanceSnapshot(
          tenantId,
          instanceId,
        );
      return {
        fields: buildCompletenessFieldSnapshot('standalone', {
          objectType,
          resolved,
        }),
        status: instance?.status,
      };
    }

    if (typeof coreId !== 'number' || coreId < 1) {
      return null;
    }

    let resolved;
    try {
      resolved = await this.configObjectsService.resolveObjectInstance(
        tenantId,
        objectType,
        coreId,
      );
    } catch {
      resolved = null;
    }
    if (!resolved || resolved.resolutionMode !== 'sor_bound') {
      return null;
    }

    return {
      fields: buildCompletenessFieldSnapshot('sor_bound', {
        objectType,
        resolved,
      }),
    };
  }

  evaluateBindingCompletion(
    params: EvaluateBindingCompletionParams,
  ): CompletionRuleEvaluation {
    const snapshot = params.snapshot;
    if (!snapshot) {
      return { valid: false, error: 'Completeness snapshot is missing' };
    }

    if (params.resolutionMode === 'standalone') {
      return evaluateCompletionRule(params.completionRule, {
        payload: snapshot.fields,
        status: snapshot.status ?? 'DRAFT',
      });
    }

    return evaluateCoreLinkedCompletionRule(
      params.completionRule,
      snapshot.fields,
    );
  }

  async isBindingComplete(
    params: EvaluateBindingCompletionParams,
  ): Promise<CompletionRuleEvaluation> {
    const snapshot =
      params.snapshot ??
      (await this.buildFieldSnapshot({
        tenantId: params.tenantId,
        objectType: params.objectType,
        resolutionMode: params.resolutionMode,
        coreId: params.coreId,
        instanceId: params.instanceId,
      }));

    if (!snapshot) {
      return { valid: false, error: 'Could not resolve object for completeness' };
    }

    return this.evaluateBindingCompletion({ ...params, snapshot });
  }
}
