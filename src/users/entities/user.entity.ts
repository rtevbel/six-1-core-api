import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
  BeforeUpdate,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserRoleEntity } from '../user-roles/entities/user-role.entity';
import { UserMetaEntity } from '../user-meta/entities/user-meta.entity';
import { hash_content } from '../../common/functions';
import { TenantEntity } from '../../tenants/entities/tenant.entity';
import { TenantWorkingHoursEntity } from '../../tenants/tenant_working_hours/entities/tenant_working_hour.entity';
import { TenantUsersEntity } from '../../tenants/tenant_users/entities/tenant_user.entity';

/**
 * Represents the `users` table in the database.
 *
 * @version 1.0.0
 */
@Entity('users')
export class UserEntity {
  /**
   * Primary key: Unique identifier for the user.
   */
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  user_id!: number;

  /**
   * User's email address (must be unique).
   */
  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email!: string;

  /**
   * User's username (must be unique).
   */
  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  username!: string;

  /**
   * User's first name.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name!: string;

  /**
   * User's last name.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name!: string;

  /**
   * Hashed password for the user.
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  password!: string;

  /**
   * Display name for the user.
   */
  @Column({ type: 'varchar', length: 250, default: '', nullable: false })
  display_name!: string;

  /**
   * URL for the user's dashboard.
   */
  @Column({ type: 'varchar', length: 100, default: '', nullable: false })
  dashboard_url!: string;

  /**
   * Activation key for the user (used for account activation).
   */
  @Column({ type: 'varchar', length: 255, default: '', nullable: false })
  activation_key!: string;

  /**
   * Status of the user (e.g., active, inactive).
   */
  @Column({ type: 'int', default: 0, nullable: false })
  status!: number;

  /**
   * Timestamp of the user's last successful login.
   */
  @Column({
    type: 'datetime',
    nullable: true,
    comment: 'Latest successful login',
  })
  last_login_at!: Date;

  /**
   * Timestamp when the user was created.
   */
  @CreateDateColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  /**
   * Timestamp when the user was last updated.
   */
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at!: Date;

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await hash_content(this.password);
    }
  }

  /**
   * One-to-many relationship with `UserRoleEntity`.
   *
   * Represents the roles associated with the user.
   */
  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  user_roles!: UserRoleEntity[];

  /**
   * Relationship to UserMetaEntity.
   * A user can have multiple metadata records.
   */
  @OneToMany(() => UserMetaEntity, (userMeta) => userMeta.user, {
    cascade: true,
  })
  user_meta!: UserMetaEntity[];

  /**
   * Relationship to TenantEntity.
   * A user can have one Tenant record.
   */
  @OneToOne(() => TenantEntity, (tenant) => tenant.user, { cascade: true })
  @JoinColumn({ name: 'user_id' })
  tenant!: TenantEntity;

  /**
   * Inverse relationship to TenantWorkingHoursEntity for createdBy.
   * A user can create multiple working hour records.
   */
  @OneToMany(
    () => TenantWorkingHoursEntity,
    (workingHour) => workingHour.createdByUser,
  )
  createdWorkingHours!: TenantWorkingHoursEntity[];

  /**
   * Inverse relationship to TenantWorkingHoursEntity for updatedByUser.
   * A user can update multiple working hour records.
   */
  @OneToMany(
    () => TenantWorkingHoursEntity,
    (workingHour) => workingHour.updatedByUser,
  )
  updatedWorkingHours!: TenantWorkingHoursEntity[];

  /**
   * Inverse relationship to TenantUsersEntity.
   * A user can be linked to multiple tenant users.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.user)
  tenantUsers!: TenantUsersEntity[];
}
