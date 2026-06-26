import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ConfigObjectVerificationAuditOutcome =
  | 'success'
  | 'failure'
  | 'rate_limited';

/**
 * Immutable audit trail for generic email verification attempts (Phase 8).
 */
@Entity('config_object_verification_audit_logs')
export class ConfigObjectVerificationAuditLogEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_verification_audit_log_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectVerificationAuditLogId!: number;

  @Column({
    name: 'object_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  objectType!: string;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  tenantId!: number | null;

  @Column({
    name: 'core_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
  })
  coreId!: number | null;

  @Column({
    name: 'outcome',
    type: 'enum',
    enum: ['success', 'failure', 'rate_limited'],
    nullable: false,
  })
  outcome!: ConfigObjectVerificationAuditOutcome;

  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  failureReason!: string | null;

  @Column({
    name: 'token_fingerprint',
    type: 'char',
    length: 16,
    nullable: false,
  })
  tokenFingerprint!: string;

  @Column({
    name: 'client_key',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  clientKey!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;
}
