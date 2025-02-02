import {
  Entity,
  Column,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

/**
 * User passwords entity class.
 *
 * Version:1.0.0.
 *
 * This is a user_passwords entity class is,
 * is used in TypeORM to map the application's data,
 * to database and vice versa.
 */
@Entity('user_passwords')
export class UserPasswordEntity {
  @PrimaryGeneratedColumn()
  password_id!: number;

  @Column()
  user_id!: number;

  @Column()
  password_hash!: string;

  @Column()
  ip_address!: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => {
      'CURRENT_TIMESTAMP(6)';
    },
    select: false,
  })
  created_at!: Date;

  //Defines many-to-one relationship with user entity.
  @ManyToOne(() => UserEntity, (user) => user.user_passwords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user!: UserEntity;
}
