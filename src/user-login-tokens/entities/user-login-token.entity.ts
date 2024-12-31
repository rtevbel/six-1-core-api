import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_login_tokens')
export class UserLoginTokenEntity {
  @PrimaryGeneratedColumn()
  token_id: number;

  @Column()
  user_id: number;

  @Column()
  token: string;

  @Column({ default: true })
  is_active: boolean;

  @Column()
  ip_address: string;

  @Column()
  user_agent: string;

  @Column()
  device_name: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => {
      'CURRENT_TIMESTAMP(6)';
    },
    select: false,
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => {
      'CURRENT_TIMESTAMP(6)';
    },
    select: false,
  })
  updated_at: Date;

  //Defines many to one relationship with user entity.
  @ManyToOne(() => UserEntity, (user) => user.user_tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'user_id',
  })
  user: UserEntity;
}
