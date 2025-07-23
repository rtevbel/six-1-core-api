import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToMany
  } from 'typeorm';
  import { TenantEntity } from '../../entities/tenant.entity';
  import { TenantUsersEntity } from '../../tenant_users/entities/tenant_user.entity';
  import { TenantTeamMemberEntity } from '../tenant_team_members/entities/tenant_team_member.entity';
  
  /**
   * Entity class for `tenant_teams` table.
   *
   * Represents the teams associated with a tenant.
   */
  @Entity('tenant_teams')
  export class TenantTeamEntity {
    @PrimaryGeneratedColumn({
      name: 'tenant_team_id',
      type: 'bigint',
      unsigned: true,
    })
    tenantTeamId!: number;
  
    @Column({
      name: 'tenant_id',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Linked tenant',
    })
    @Index('tenant_teams_tenant_id')
    tenantId!: number;
  
    @Column({
      name: 'team_identifier',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Identifier used to view team details publicly',
    })
    @Index('unique_team', { unique: true })
    teamIdentifier!: string;
  
    @Column({
      name: 'name',
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: 'Name of the team',
    })
    name!: string;
  
    @Column({
      name: 'description',
      type: 'text',
      nullable: true,
      comment: 'Description of the team',
    })
    description!: string;
  
    @Column({
      name: 'created_by',
      type: 'bigint',
      unsigned: true,
      nullable: false,
      comment: 'Tenant-user who created the team',
    })
    @Index('tenant_teams_created_by')
    createdBy!: number;
  
    @Column({
      name: 'updated_by',
      type: 'bigint',
      unsigned: true,
      default: 0,
      comment: 'Tenant-user who updated the team',
    })
    @Index('tenant_teams_updated_by')
    updatedBy!: number;
  
    @CreateDateColumn({
      name: 'created_at',
      type: 'datetime',
      default: () => 'CURRENT_TIMESTAMP(6)',
    })
    createdAt!: Date;
  
    @UpdateDateColumn({
      name: 'updated_at',
      type: 'timestamp',
      default: () => 'CURRENT_TIMESTAMP(6)',
      onUpdate: 'CURRENT_TIMESTAMP(6)',
    })
    updatedAt!: Date;
  
    /**
     * Relationship to TenantEntity.
     * A team belongs to one tenant.
     */
    @ManyToOne(() => TenantEntity, (tenant) => tenant.teams, {
      onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'tenant_id' })
    tenant!: TenantEntity;
  
    /**
     * Relationship to TenantUsersEntity.
     * A team is created by one tenant user.
     */
    @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.createdTeams)
    @JoinColumn({ name: 'created_by' })
    createdByUser!: TenantUsersEntity;
  
    /**
     * Relationship to TenantUserEntity.
     * A team is updated by one tenant user.
     */
    @ManyToOne(() => TenantUsersEntity, (tenantUser) => tenantUser.updatedTeams, {
      onDelete: 'SET NULL',
    })
    @JoinColumn({ name: 'updated_by' })
    updatedByUser!: TenantUsersEntity;

   /**
  * Relationship to TenantTeamMemberEntity.
  * A team has many members.
  */
    @OneToMany(() => TenantTeamMemberEntity, (member) => member.team, {
      cascade: true,
    })
    members!: TenantTeamMemberEntity[];
  }