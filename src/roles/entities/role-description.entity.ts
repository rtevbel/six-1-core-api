import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';

@Entity('role_descriptions')
export class RoleDescription {
  @PrimaryGeneratedColumn()
  role_description_id: number;

  @Column()
  role_id: number;

  @Column()
  language_id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  created_by: number;

  @Column()
  updated_by: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  updated_at: Date;

  @ManyToOne(() => Role, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role: Role;
}
