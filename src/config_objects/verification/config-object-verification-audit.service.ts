import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConfigObjectVerificationAuditLogEntity,
  type ConfigObjectVerificationAuditOutcome,
} from '../entities/config_object_verification_audit_log.entity';
import { verificationTokenFingerprint } from './verification-token-fingerprint.util';

export interface RecordVerificationAuditParams {
  objectType: string;
  tenantId?: number | null;
  coreId?: number | null;
  outcome: ConfigObjectVerificationAuditOutcome;
  failureReason?: string | null;
  token: string;
  clientKey?: string | null;
}

/**
 * Persists verify RPC outcomes for security review (Phase 8).
 */
@Injectable()
export class ConfigObjectVerificationAuditService {
  private readonly logger = new Logger(ConfigObjectVerificationAuditService.name);

  constructor(
    @InjectRepository(ConfigObjectVerificationAuditLogEntity)
    private readonly auditRepository: Repository<ConfigObjectVerificationAuditLogEntity>,
  ) {}

  async record(params: RecordVerificationAuditParams): Promise<void> {
    const row = this.auditRepository.create({
      objectType: params.objectType.trim(),
      tenantId:
        typeof params.tenantId === 'number' && params.tenantId > 0
          ? params.tenantId
          : null,
      coreId:
        typeof params.coreId === 'number' && params.coreId > 0
          ? params.coreId
          : null,
      outcome: params.outcome,
      failureReason: params.failureReason?.trim() || null,
      tokenFingerprint: verificationTokenFingerprint(params.token),
      clientKey: params.clientKey?.trim() || null,
    });

    try {
      await this.auditRepository.save(row);
    } catch (error) {
      this.logger.error(
        `Failed to persist verification audit for ${params.objectType}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
