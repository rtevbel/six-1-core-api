import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConfigObjectFieldEntity } from './config_object_field.entity';

/**
 * Entity class for `config_object_field_rules` table.
 *
 * Encodes role- and lifecycle-specific behaviour for a field, such as visibility,
 * read-only state, and required status, plus optional rule metadata.
 */
@Entity('config_object_field_rules')
export class ConfigObjectFieldRuleEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_field_rule_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectFieldRuleId!: number;

  @Column({
    name: 'config_object_field_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectFieldId!: number;

  @Column({
    name: 'lifecycle_state_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  lifecycleStateKey!: string | null;

  @Column({
    name: 'role_key',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  roleKey!: string | null;

  @Column({
    name: 'is_visible',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  isVisible!: boolean;

  @Column({
    name: 'is_readonly',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isReadonly!: boolean;

  @Column({
    name: 'is_required',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isRequired!: boolean;

  @Column({
    name: 'rules_json',
    type: 'json',
    nullable: true,
  })
  rulesJson!: Record<string, unknown> | null;

  @ManyToOne(
    () => ConfigObjectFieldEntity,
    (field) => field.rules,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_field_id' })
  configObjectField!: ConfigObjectFieldEntity;
}

