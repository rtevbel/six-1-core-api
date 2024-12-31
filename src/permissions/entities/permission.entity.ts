import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PermissionDescription } from './permission-description.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  permission_id: number;

  @Column({
    default: false,
  })
  is_active: boolean;

  @Column({
    default: false,
    select: false,
  })
  is_deleted: boolean;

  @Column({
    select: false,
  })
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

  @OneToMany(
    () => PermissionDescription,
    (descriptions) => descriptions.permission,
    {
      cascade: true, // Handle relational operation automatically (e.g. add/update/delete) application description data.
      onDelete: 'CASCADE', // Delete child rows when parent is deleted
      orphanedRowAction: 'delete', // Automatically delete orphaned row
      eager: true, // With this earger attribute true the TypeOrm will load the application description without passing the relations in find query.
    },
  )
  descriptions: PermissionDescription[];
}
