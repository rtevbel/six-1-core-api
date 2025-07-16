import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  Unique,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from '../../entities/user.entity';

/**
 * Entity class for `user_meta` table.
 *
 * Represents user metadata entries associated with a user.
 */
@Entity('user_meta')
@Unique('unique_user_meta_key', ['user_id', 'meta_key'])
export class UserMetaEntity {
  /**
   * Primary key for the `user_meta` table.
   * Auto-incremented big integer.
   */
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  user_meta_id!: number;

  /**
   * Foreign key referencing the `user_id` column in the `user` table.
   * Indexed for faster lookups.
   */
  @Column({ type: 'bigint', unsigned: true, nullable: false })
  @Index('user_meta_user_id')
  user_id!: number;

  /**
   * Key for the metadata entry.
   * Indexed for faster lookups.
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  @Index('user_meta_key')
  meta_key!: string;

  /**
   * Value for the metadata entry.
   * Can be null if no value is provided.
   */
  @Column({ type: 'text', nullable: true })
  meta_value!: string;

  /**
   * Timestamp indicating when the metadata entry was created.
   * Defaults to the current timestamp.
   */
  @CreateDateColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at!: Date;

  /**
   * Relationship to UserEntity.
   * Defines a many-to-one relationship with the `user` table.
   * Deletes metadata entries when the associated user is deleted.
   */
  @ManyToOne(() => UserEntity, (user) => user.user_meta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'user_id' })
  user!: UserEntity;
}
