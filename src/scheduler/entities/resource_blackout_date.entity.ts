import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ResourceEntity } from './resource.entity';

/**
 * Entity representing blackout periods where a resource cannot be scheduled.
 */
@Entity('resource_blackout_dates')
export class ResourceBlackoutDateEntity {
  @PrimaryGeneratedColumn({
    name: 'blackout_id',
    type: 'bigint',
    unsigned: true,
  })
  blackoutId!: number;

  @Column({
    name: 'resource_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('resource_blackout_resource_id')
  resourceId!: number;

  @Column({
    name: 'start_date',
    type: 'date',
    nullable: false,
  })
  startDate!: string;

  @Column({
    name: 'end_date',
    type: 'date',
    nullable: false,
  })
  endDate!: string;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  description?: string;

  @ManyToOne(() => ResourceEntity, (resource) => resource.blackoutWindows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;
}
