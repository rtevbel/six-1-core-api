import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleDescriptionEntity } from './role-description.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('roles')
export class RoleEntity {
  @PrimaryGeneratedColumn()
  role_id!: number;

  @Column({ default: false })
  is_active: boolean = false;

  @Column({ default: false })
  is_deleted: boolean = false;

  @Column()
  created_by: number = 0;

  @Column()
  updated_by: number = 0;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  updated_at!: Date;

  @OneToMany(() => RoleDescriptionEntity, (description) => description.role, {
    cascade: true, // Handle relational operation automatically (e.g. add/update/delete) application description data.
    onDelete: 'CASCADE', // Delete child rows when parent is deleted
    orphanedRowAction: 'delete', // Automatically delete orphaned row
    eager: true, // With this earger attribute true the TypeOrm will load the application description without passing the relations in find query.
  })
  descriptions!: RoleDescriptionEntity[];

  @OneToMany(() => RolePermissionEntity, (permission) => permission.role, {
    cascade: true, // Handle relational operation automatically (e.g. add/update/delete) application description data.
    onDelete: 'CASCADE', // Delete child rows when parent is deleted
    orphanedRowAction: 'delete', // Automatically delete orphaned row
    eager: true, // With this earger attribute true the TypeOrm will load the application description without passing the relations in find query.
  })
  permissions!: RolePermissionEntity[];
}
