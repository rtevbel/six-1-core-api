import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConfigObjectEntity } from './config_object.entity';

/**
 * JSON Logic verification trigger rule for a configurable object (Phase 3).
 */
@Entity('config_object_verification_rules')
export class ConfigObjectVerificationRuleEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_verification_rule_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectVerificationRuleId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'trigger_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  triggerKey!: string;

  @Column({
    name: 'when_json',
    type: 'json',
    nullable: false,
  })
  whenJson!: Record<string, unknown>;

  @Column({
    name: 'then_json',
    type: 'json',
    nullable: false,
  })
  thenJson!: Record<string, unknown>;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  isActive!: boolean;

  @ManyToOne(() => ConfigObjectEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;
}
