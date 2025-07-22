import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantUsersEntity } from '../../entities/tenant_user.entity';

/**
 * Entity class for `tenant_user_working_hours` table.
 *
 * Represents the working hours for tenant users.
 */
@Entity('tenant_user_working_hours')
export class TenantUserWorkingHoursEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_working_hour_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserWorkingHourId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant user',
  })
  tenantUserId!: number;

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
    comment: 'Day of the week',
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
    comment: 'User who created the working hours',
  })
  createdBy!: number;

  @Column({
    name: 'updated_by',
    type: 'bigint',
    unsigned: true,
    default: 0,
    comment: 'User who last updated the working hours',
  })
  updatedBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the working hours were created',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
    comment: 'When the working hours were last updated',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantUsersEntity.
   * A working hour belongs to one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.workingHours, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for createdBy.
   * The working hours are created by one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.createdWorkingHours,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'created_by' })
  createdByUser!: TenantUsersEntity;

  /**
   * Relationship to TenantUsersEntity for updatedBy.
   * The working hours are updated by one tenant user.
   */
  @ManyToOne(
    () => TenantUsersEntity,
    (tenantUser) => tenantUser.updatedWorkingHours,
    {
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'updated_by' })
  updatedByUser!: TenantUsersEntity;
}
