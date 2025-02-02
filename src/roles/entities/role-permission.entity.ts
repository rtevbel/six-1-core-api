import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from '../../permissions/entities/permission.entity';

@Entity('role_permissions')
export class RolePermissionEntity {
  
  @PrimaryGeneratedColumn()
  role_permission_id!: number;

  @Column()
  role_id!: number;

  @Column()
  permission_id!: number;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at!: Date;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: RoleEntity;

  @OneToOne(() => PermissionEntity)
  @JoinColumn({
    name: 'permission_id',
  })
  permission!: PermissionEntity;
}
