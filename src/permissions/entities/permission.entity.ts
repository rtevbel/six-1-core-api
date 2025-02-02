import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PermissionDescriptionEntity } from './permission-description.entity';

/**
 * Entity representing a permission.
 * 
 * @version 1.0.0
 * 
 * This entity defines the structure of the `permissions` table,
 * including fields for status, audit tracking, and relationships
 * with permission descriptions.
 */
@Entity('permissions')
export class PermissionEntity {
  
  /**
   * Primary key for the permission.
   * 
   * - Auto-generated unique ID.
   * 
   * @example 1
   * 
   * @type {number}
   */
  @PrimaryGeneratedColumn()
  permission_id: number = 0;

  /**
   * Indicates whether the permission is active.
   * 
   * - Default value: `false`
   * 
   * @example true
   * 
   * @type {boolean}
   */
  @Column({ default: false })
  is_active: boolean = false;

  /**
   * Indicates whether the permission is deleted.
   * 
   * - Default value: `false`
   * 
   * @example false
   * 
   * @type {boolean}
   */
  @Column({ default: false })
  is_deleted: boolean = false;

  /**
   * ID of the user who created the permission.
   * 
   * @example 101
   * 
   * @type {number}
   */
  @Column()
  created_by: number = 0;

  /**
   * ID of the user who last updated the permission.
   * 
   * - Default value: `0`
   * 
   * @example 102
   * 
   * @type {number}
   */
  @Column({ default: 0})
  updated_by: number = 0;

  /**
   * Timestamp indicating when the permission was created.
   * 
   * - Automatically set to the current timestamp.
   * 
   * @example "2025-02-01T12:00:00.000Z"
   * 
   * @type {Date}
   */
  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)'})
  created_at!: Date;

  /**
   * Timestamp indicating when the permission was last updated.
   * 
   * - Automatically set to the current timestamp.
   * 
   * @example "2025-02-01T12:30:00.000Z"
   * 
   * @type {Date}
   */
  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP(6)'})
  updated_at!: Date;

  /**
   * Descriptions associated with this permission.
   * 
   * - Cascade operations enabled (insert/update/delete).
   * - Child rows are deleted when the parent is deleted.
   * - Orphaned rows are automatically deleted.
   * - Data is eagerly loaded by default.
   * 
   * @example [{ language_id: 1, name: "View Orders", description: "Allows viewing of orders" }]
   * 
   * @type {PermissionDescriptionEntity[]}
   */
  @OneToMany(() => PermissionDescriptionEntity, (descriptions) => descriptions.permission, {
    cascade: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
    eager: true,
  })
  descriptions!: PermissionDescriptionEntity[];
}
