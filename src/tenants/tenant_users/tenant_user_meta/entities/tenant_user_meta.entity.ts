import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { TenantUsersEntity } from '../../entities/tenant_user.entity';

/**
 * Entity class for `tenant_user_meta` table.
 *
 * Represents metadata associated with tenant users.
 */
@Entity('tenant_user_meta')
@Unique('unique_meta', ['tenantUserId', 'metaKey'])
export class TenantUserMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'tenant_user_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  tenantUserMetaId!: number;

  @Column({
    name: 'tenant_user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked tenant user',
  })
  @Index('tenant_user_meta_tenant_user_id')
  tenantUserId!: number;

  @Column({
    name: 'meta_key',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Key for the metadata',
  })
  metaKey!: string;

  @Column({
    name: 'meta_value',
    type: 'text',
    nullable: true,
    comment: 'Value for the metadata',
  })
  metaValue?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;

  /**
   * Relationship to TenantUsersEntity for tenantUserId.
   * Metadata is linked to one tenant user.
   */
  @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.meta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_user_id' })
  tenantUser!: TenantUsersEntity;
}
