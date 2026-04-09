import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ConfigObjectEntity } from './config_object.entity';

/**
 * Entity class for `config_object_lifecycle_transitions` table.
 *
 * Defines allowed lifecycle transitions between states for a given config object,
 * along with optional transition rule metadata.
 */
@Entity('config_object_lifecycle_transitions')
export class ConfigObjectLifecycleTransitionEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_lifecycle_transition_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectLifecycleTransitionId!: number;

  @Column({
    name: 'config_object_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  configObjectId!: number;

  @Column({
    name: 'from_state_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  fromStateKey!: string;

  @Column({
    name: 'to_state_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  toStateKey!: string;

  @Column({
    name: 'rules_json',
    type: 'json',
    nullable: true,
  })
  rulesJson!: Record<string, unknown> | null;

  @ManyToOne(
    () => ConfigObjectEntity,
    (configObject) => configObject.lifecycles,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'config_object_id' })
  configObject!: ConfigObjectEntity;
}

