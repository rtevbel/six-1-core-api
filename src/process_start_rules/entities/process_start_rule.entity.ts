import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcessTemplateEntity } from '../../process_templates/entities/process_template.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('process_start_rules')
export class ProcessStartRuleEntity {
  @PrimaryGeneratedColumn({
    name: 'rule_id',
    type: 'bigint',
    unsigned: true,
  })
  ruleId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    default: 0,
  })
  tenantId!: number;

  @Column({
    name: 'event_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  eventName!: string;

  @Column({
    name: 'filter_json',
    type: 'json',
    nullable: true,
  })
  filterJson?: Record<string, unknown> | null;

  @Column({
    name: 'template_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  templateId!: number;

  @Column({
    name: 'subject_type',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  subjectType!: string;

  @Column({
    name: 'subject_id_source',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  subjectIdSource!: string;

  @Column({
    name: 'context_patch',
    type: 'json',
    nullable: true,
  })
  contextPatch?: Record<string, unknown> | null;

  @Column({
    name: 'priority',
    type: 'int',
    default: 100,
  })
  priority!: number;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    width: 1,
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    default: 0,
  })
  updatedBy?: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @ManyToOne(() => ProcessTemplateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template?: ProcessTemplateEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}
