import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    Index,
    ManyToOne,
    JoinColumn,
  } from 'typeorm';
  import { ProjectTaskStatusEntity } from '../../projects/project_task_statuses/entities/project_task_status.entity';
  
  /**
   * Entity class for `project_step_status_mappings` table.
   */
  @Entity('project_step_status_mappings')
  export class ProjectStepStatusMappingEntity {
    @PrimaryGeneratedColumn({
      name: 'mapping_id',
      type: 'bigint',
      unsigned: true,
    })
    mappingId!: number;
  
    @Column({
      name: 'project_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
    })
    @Index('pssm_project_id')
    projectId!: number;
  
    @Column({
      name: 'step_instance_id',
      type: 'bigint',
      unsigned: true,
      nullable: true,
    })
    @Index('pssm_step_instance_id')
    stepInstanceId?: number;
  
    @Column({
      name: 'step_instance_id_norm',
      type: 'bigint',
      unsigned: true,
      generatedType: 'STORED',
      asExpression: 'IFNULL(`step_instance_id`, 0)',
    })
    stepInstanceIdNorm!: number;
  
    @Column({
      name: 'step_engine_state',
      type: 'enum',
      enum: ['pending', 'ready', 'in_progress', 'completed', 'blocked', 'canceled'],
      nullable: false,
    })
    stepEngineState!: 'pending' | 'ready' | 'in_progress' | 'completed' | 'blocked' | 'canceled';
  
    @Column({
      name: 'task_status_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
    })
    @Index('pssm_task_status_id')
    taskStatusId!: number;
  
    /**
     * Relationship to ProjectTaskStatusEntity.
     * A mapping references one task status.
     */
    @ManyToOne(() => ProjectTaskStatusEntity, (taskStatus) => taskStatus.stepStatusMappings, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'task_status_id' })
    taskStatus!: ProjectTaskStatusEntity;
  }