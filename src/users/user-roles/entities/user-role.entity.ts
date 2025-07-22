import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  Unique,
} from 'typeorm';
import { UserEntity } from '../../entities/user.entity';
import { RoleEntity } from '../../../roles/entities/role.entity';

/**
 * Entity class for `user_roles` table.
 *
 * Represents the mapping between users and roles.
 */
@Entity('user_roles')
@Unique('unique_user_id_role_id', ['user_id', 'role_id'])
export class UserRoleEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  user_role_id!: number;

  @Column({ type: 'bigint', unsigned: true, nullable: false })
  @Index('user_roles_user_id')
  user_id!: number;

  @Column({ type: 'int', unsigned: true, nullable: false })
  @Index('user_roles_role_id')
  role_id!: number;

  @Column({ type: 'bigint', unsigned: true, nullable: false })
  @Index('user_roles_created_by')
  created_by!: number;

  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  /**
   * Many-to-one relationship with `UserEntity`.
   *
   * Represents the user associated with this role.
   */
  @ManyToOne(() => UserEntity, (user) => user.user_roles, {
    onDelete: 'CASCADE',
  })
  user!: UserEntity;

  /**
   * Many-to-one relationship with `RoleEntity`.
   *
   * Represents the role associated with this user.
   */
  @ManyToOne(() => RoleEntity, (role) => role.userRoles)
  role!: RoleEntity;

  /**
   * Many-to-one relationship with `UserEntity` for created_by.
   *
   * Represents the user who created this mapping.
   */
  @ManyToOne(() => UserEntity)
  createdByUser!: UserEntity;
}
