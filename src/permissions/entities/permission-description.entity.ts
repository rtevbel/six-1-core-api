import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Permission } from './permission.entity';

@Entity('permission_descriptions')
export class PermissionDescription {
  @PrimaryGeneratedColumn()
  permission_description_id: number;

  @Column()
  permission_id: number;

  @Column()
  language_id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ select: false })
  created_by: number;

  @Column({
    default: 0,
    select: false,
  })
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

  @ManyToOne(() => Permission, (permission) => permission.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
