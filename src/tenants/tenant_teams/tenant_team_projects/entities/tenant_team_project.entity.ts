import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    Unique,
  } from 'typeorm';
  import { TenantTeamEntity } from '../../entities/tenant_team.entity';
  import { ProjectEntity } from '../../../../projects/entities/project.entity';
  import { TenantUsersEntity } from '../../../tenant_users/entities/tenant_user.entity';
  
  /**
   * Entity class for `tenant_team_projects` table.
   *
   * Represents the projects assigned to a tenant team.
   */
  @Entity('tenant_team_projects')
  @Unique('unique_team_project', ['tenantTeamId', 'projectId'])
  export class TenantTeamProjectEntity {
    @PrimaryGeneratedColumn({
      name: 'team_project_id',
      type: 'bigint',
      unsigned: true,
    })
    teamProjectId!: number;
  
    @Column({
      name: 'tenant_team_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked team',
    })
    @Index('tenant_team_projects_team_id')
    tenantTeamId!: number;
  
    @Column({
      name: 'project_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked project',
    })
    @Index('tenant_team_projects_project_id')
    projectId!: number;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'User who assigned the project',
    })
    @Index('tenant_team_projects_created_by')
    createdBy!: number;
  
    @CreateDateColumn({
      name: 'created_at',
      type: 'datetime',
      default: () => 'CURRENT_TIMESTAMP',
      comment: 'When the project was assigned',
    })
    createdAt!: Date;
  
    /**
     * Relationship to TenantTeamEntity.
     * A project is linked to one team.
     */
    @ManyToOne(() => TenantTeamEntity, (team) => team.projects, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tenant_team_id' })
    team!: TenantTeamEntity;
  
    /**
     * Relationship to ProjectEntity.
     * A project is linked to one project entity.
     */
    @ManyToOne(() => ProjectEntity, (project) => project.teamAssignments, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'project_id' })
    project!: ProjectEntity;
  
    /**
     * Relationship to TenantUsersEntity.
     * A project assignment is created by one user.
     */
    @ManyToOne(() => TenantUsersEntity, (user) => user.projectAssignments, {
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'created_by' })
    createdByUser!: TenantUsersEntity;
  }