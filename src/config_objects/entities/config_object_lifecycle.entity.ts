import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ConfigObjectEntity } from './config_object.entity';
import { ConfigObjectLifecycleTransitionEntity } from './config_object_lifecycle_transition.entity';

/**
 * Entity class for `config_object_lifecycles` table.
 *
 * Represents a single lifecycle state for a configurable object type,
 * including its display label and relative ordering.
 */
@Entity('config_object_lifecycles')
export class ConfigObjectLifecycleEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_lifecycle_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectLifecycleId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'state_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  stateKey!: string;

  @Column({
    name: 'label',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  label!: string;

  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
  })
  description!: string | null;

  @Column({
    name: 'order_index',
    type: 'int',
    default: 0,
  })
  orderIndex!: number;

  @ManyToOne(
    () => ConfigObjectEntity,
    (configObject) => configObject.lifecycles,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;

  @OneToMany(
    () => ConfigObjectLifecycleTransitionEntity,
    (transition) => transition.configObject,
  )
  transitions!: ConfigObjectLifecycleTransitionEntity[];
}

