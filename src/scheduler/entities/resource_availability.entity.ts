import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ResourceEntity } from './resource.entity';

/**
 * Entity representing recurring or ad-hoc availability slots for a resource.
 */
@Entity('resource_availability')
export class ResourceAvailabilityEntity {
  @PrimaryGeneratedColumn({
    name: 'availability_id',
    type: 'bigint',
    unsigned: true,
  })
  availabilityId!: number;

  @Column({
    name: 'resource_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  @Index('resource_availability_resource_id')
  resourceId!: number;

  @Column({
    name: 'start_time',
    type: 'datetime',
    nullable: false,
  })
  startTime!: Date;

  @Column({
    name: 'end_time',
    type: 'datetime',
    nullable: false,
  })
  endTime!: Date;

  @Column({
    name: 'is_recurring',
    type: 'tinyint',
    unsigned: true,
    default: 0,
  })
  isRecurring!: boolean;

  @Column({
    name: 'recurrence_rule',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recurrenceRule?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @ManyToOne(() => ResourceEntity, (resource) => resource.availabilitySlots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource!: ResourceEntity;
}
