import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

/**
 * User-role entity class.
 *
 * Version:1.0.0.
 *
 * This entity class is used in,
 * TypeORM to map application data to,
 * database and vice versa.
 */
@Entity('user_roles')
export class UserRoleEntity {
  @PrimaryGeneratedColumn()
  user_role_id!: number;

  @Column()
  user_id!: number;

  @Column()
  role_id!: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at!: Date;

  @ManyToOne(() => UserEntity, (user) => user.user_roles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
