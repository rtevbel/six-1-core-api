import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn()
  role_permission_id: number;

  @Column()
  role_id: number;

  @Column()
  permission_id: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at: Date;

  @ManyToOne(() => Role, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role: Role;

  @OneToOne(() => Permission)
  @JoinColumn({
    name: 'permission_id',
  })
  permission: Permission;
}
