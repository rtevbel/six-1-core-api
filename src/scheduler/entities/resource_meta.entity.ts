import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ResourceEntity } from './resource.entity';

/**
 * Entity class for `resource_meta` table.
 *
 * Stores dynamic JSON field values for a resource instance, keyed by
 * configurable field keys defined in the config metadata layer.
 */
@Entity('resource_meta')
export class ResourceMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'resource_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  resourceMetaId!: number;

  @Column({
    name: 'resource_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  resourceId!: number;

  @Column({
    name: 'meta_json',
    type: 'json',
    nullable: false,
  })
  metaJson!: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
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

  @OneToOne(() => ResourceEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;
}

