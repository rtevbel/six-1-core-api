import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  OneToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { TenantEntity } from '../../../tenants/entities/tenant.entity';
import { TenantTypeEntity } from '../../../tenants/tenant_types/entities/tenant_type.entity';
import { TenantUsersEntity } from '../../../tenants/tenant_users/entities/tenant_user.entity';
import { CategoryEntity } from '../../../categories/entities/category.entity';

/**
 * Entity class for `system_statuses` table.
 *
 * Represents the statuses in the system.
 */
@Entity('system_statuses')
export class SystemStatusEntity {
  @PrimaryGeneratedColumn({ type: 'tinyint', unsigned: true })
  status_id!: number;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    unique: true,
    comment: 'Human-readable status name',
  })
  @Index('system_statuses_name')
  name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  module_name!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  module_identifier!: string;

  /**
   * Relationship to TenantEntity.
   * A status can have one Tenant record.
   */
  @OneToOne(() => TenantEntity, (tenant) => tenant.user, { cascade: true })
  @JoinColumn({ name: 'status_id' })
  tenant!: TenantEntity;

  /**
   * Relationship to TenantTypeEntity.
   * A status can have one Tenant type record.
   */
  @OneToOne(() => TenantTypeEntity, (tenant_type) => tenant_type.status, {
    cascade: true,
  })
  @JoinColumn({ name: 'status_id' })
  tennant_type!: TenantTypeEntity;

  /**
   * Inverse relationship to TenantUsersEntity.
   * A status can be linked to multiple tenant users.
   */
  @OneToMany(() => TenantUsersEntity, (tenantUser) => tenantUser.status)
  tenantUsers!: TenantUsersEntity[];

  /**
   * One-to-many relationship with `CategoryEntity`.
   *
   * Represents the categories associated with the system status.
   */
  @OneToMany(() => CategoryEntity, (category) => category.status)
  categories!: CategoryEntity[];
}
