import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AppLanguagesEnum } from "../../common/enums/app-languages.enum";
import { PermissionEntity } from './permission.entity';

/**
 * Entity representing the description of a permission.
 * 
 * @version 1.0.0
 * 
 * This entity defines the structure of the `permission_descriptions` table,
 * including the relationship with the `permissions` table, and fields for
 * the language, name, and description of the permission.
 */
@Entity('permission_descriptions')
export class PermissionDescriptionEntity {
  
  /**
   * Primary key for the permission description.
   * 
   * - Auto-generated unique ID.
   * 
   * @example 1
   * 
   * @type {number}
   */
  @PrimaryGeneratedColumn()
  permission_description_id: number = 0;

  /**
   * Foreign key referencing the associated permission.
   * 
   * - Represents the permission this description is associated with.
   * 
   * @example 1
   * 
   * @type {number}
   */
  @Column()
  permission_id: number = 0;

  /**
   * The language ID for the description.
   * 
   * - Default value: `AppLanguagesEnum.English`.
   * 
   * @example 1 // English
   * 
   * @type {number}
   */
  @Column()
  language_id: number = AppLanguagesEnum.English;

  /**
   * The name of the permission description.
   * 
   * - The title or label used for the permission.
   * 
   * @example "View Orders"
   * 
   * @type {string}
   */
  @Column()
  name: string = '';

  /**
   * A detailed description of the permission.
   * 
   * - A textual description explaining the permission's function.
   * 
   * @example "Allows users to view the order details."
   * 
   * @type {string}
   */
  @Column()
  description: string = '';

  /**
   * Identifier of the user who created the permission description.
   * 
   * @example 101
   * 
   * @type {number}
   */
  @Column()
  created_by: number = 0;

  /**
   * Identifier of the user who last updated the permission description.
   * 
   * - Default value: `0`.
   * 
   * @example 102
   * 
   * @type {number}
   */
  @Column({ default: 0 })
  updated_by: number = 0;

  /**
   * Timestamp indicating when the permission description was created.
   * 
   * - Automatically set to the current timestamp.
   * 
   * @example "2025-02-01T12:00:00.000Z"
   * 
   * @type {Date}
   */
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created_at!: Date;

  /**
   * Timestamp indicating when the permission description was last updated.
   * 
   * - Automatically set to the current timestamp.
   * 
   * @example "2025-02-01T12:30:00.000Z"
   * 
   * @type {Date}
   */
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)'
  })
  updated_at!: Date;

  /**
   * Relation to the `PermissionEntity` representing the permission
   * this description belongs to.
   * 
   * - `onDelete: 'CASCADE'` ensures that if the permission is deleted,
   *   all its related descriptions will also be deleted.
   * 
   * @example { permission_id: 1, name: "View Orders", description: "Allows viewing orders" }
   * 
   * @type {PermissionEntity}
   */
  @ManyToOne(() => PermissionEntity, (permission) => permission.descriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission!: PermissionEntity;
}
