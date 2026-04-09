import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProjectEntity } from './project.entity';

/**
 * Entity class for `project_meta` table.
 *
 * Stores dynamic JSON field values for a project instance, keyed by
 * configurable field keys defined in the config metadata layer.
 */
@Entity('project_meta')
export class ProjectMetaEntity {
  @PrimaryGeneratedColumn({
    name: 'project_meta_id',
    type: 'bigint',
    unsigned: true,
  })
  projectMetaId!: number;

  @Column({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
  })
  projectId!: number;

  @Column({
    name: 'meta_json',
    type: 'json',
    nullable: false,
  })
  metaJson!: Record<string, unknown>;

  @CreateDateColumn({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'datetime',
    precision: 6,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;

  @OneToOne(() => ProjectEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project!: ProjectEntity;
}

