import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  Unique,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { UserEntity } from '../../entities/user.entity';

/**
 * Entity class for `user_meta` table.
 *
 * Represents user metadata entries associated with a user.
 */
@Entity('user_meta')
@Unique('unique_user_meta_key', ['userId', 'metaKey'])
export class UserMetaEntity {
  /**
   * Primary key for the `user_meta` table.
   * Auto-incremented big integer.
   */
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'user_meta_id',
    unsigned: true,
  })
  userMetaId!: number;

  /**
   * Foreign key referencing the `user_id` column in the `user` table.
   * Indexed for faster lookups.
   */
  @Column({ type: 'bigint', name: 'user_id', unsigned: true, nullable: false })
  @Index('user_meta_user_id')
  userId!: number;

  /**
   * Key for the metadata entry.
   * Indexed for faster lookups.
   */
  @Column({ type: 'varchar', name: 'meta_key', length: 255, nullable: false })
  @Index('user_meta_key')
  metaKey!: string;

  /**
   * Value for the metadata entry.
   * Can be null if no value is provided.
   */
  @Column({ type: 'text', name: 'meta_value', nullable: true })
  metaValue!: string;

  /**
   * Timestamp indicating when the metadata entry was created.
   * Defaults to the current timestamp.
   */
  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * Relationship to UserEntity.
   * Defines a many-to-one relationship with the `user` table.
   * Deletes metadata entries when the associated user is deleted.
   */
  @ManyToOne(() => UserEntity, (user) => user.userMeta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  user!: UserEntity;

  /**
   * Hook to perform actions before inserting a new record.
   */
  @BeforeInsert()
  @BeforeUpdate()
  async validateMetaValue(): Promise<void> {
    // Add any necessary validation or transformation logic for metaValue here.
  }
}
