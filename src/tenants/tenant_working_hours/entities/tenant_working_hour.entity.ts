import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantEntity } from '../../entities/tenant.entity';
import { UserEntity } from '../../../users/entities/user.entity';

/**
 * Entity class for `tenant_working_hours` table.
 *
 * Represents the working hours of tenants in the system.
 */
@Entity('tenant_working_hours')
export class TenantWorkingHoursEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_working_hour_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantWorkingHourId!: number;

  @Column({
    name: 'tenant_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant',
  })
  tenantId!: number;

  @Column({
    name: 'day_of_week',
    type: 'enum',
    enum: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    nullable: false,
  })
  dayOfWeek!: string;

  @Column({
    name: 'start_time',
    type: 'time',
    nullable: false,
    comment: 'Start of working hours',
  })
  startTime!: string;

  @Column({
    name: 'end_time',
    type: 'time',
    nullable: false,
    comment: 'End of working hours',
  })
  endTime!: string;

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
    default: 0,
  })
  updatedBy!: number;

  /**
   * Relationship to TenantEntity.
   * A working hour record belongs to one tenant.
   */
  @ManyToOne(() => TenantEntity, (tenant) => tenant.tenantId, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to UserEntity for createdBy.
   * A working hour record is created by one user.
   */
  @ManyToOne(() => UserEntity, (user) => user.user_id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser!: UserEntity;

  /**
   * Relationship to UserEntity for updatedBy.
   * A working hour record is updated by one user.
   */
  @ManyToOne(() => UserEntity, (user) => user.user_id, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: UserEntity;
}
