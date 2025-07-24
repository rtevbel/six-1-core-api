import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
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
@Unique('unique_user_id_role_id', ['userId', 'roleId'])
export class UserRoleEntity {
  @PrimaryGeneratedColumn({
    name: 'user_role_id',
    type: 'int',
    unsigned: true,
  })
  userRoleId!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'ID of the user associated with the role',
  })
  userId!: number;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment: 'ID of the role associated with the user',
  })
  roleId!: number;

  @Column({
    name: 'created_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'ID of the user who created this mapping',
  })
  createdBy!: number;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Many-to-one relationship with `UserEntity`.
   *
   * Represents the user associated with this role.
   */
  @ManyToOne(() => UserEntity, (user) => user.userRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /**
   * Many-to-one relationship with `RoleEntity`.
   *
   * Represents the role associated with this user.
   */
  @ManyToOne(() => RoleEntity, (role) => role.userRoles)
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  /**
   * Many-to-one relationship with `UserEntity` for created_by.
   *
   * Represents the user who created this mapping.
   */
  @ManyToOne(() => UserEntity, (user) => user.createdUserRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'created_by' })
  creator!: UserEntity;

}