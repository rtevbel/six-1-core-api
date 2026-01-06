import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('customer_invitations')
export class CustomerInvitationEntity {
  @PrimaryGeneratedColumn({
    name: 'invitation_id',
    type: 'bigint',
    unsigned: true,
  })
  invitationId!: number;

  @Column({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked project',
  })
  @Index('customer_invitations_project_id')
  projectId!: number;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: 'Linked task (optional)',
  })
  @Index('customer_invitations_task_id')
  taskId!: number | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Email of the customer',
  })
  @Index('customer_invitations_email')
  email!: string;

  @Column({
    name: 'token',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Invitation token',
  })
  token!: string;

  @Column({
    name: 'customer_role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment: 'Role of the customer in the project or task',
  })
  customerRoleId!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
    comment: 'Status of the invitation',
  })
  status!: 'pending' | 'accepted' | 'declined';

  @Column({
    name: 'invited_by',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'User who sent the invitation',
  })
  invitedBy!: number;

  @CreateDateColumn({
    name: 'invited_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  invitedAt!: Date;

  @Column({
    name: 'expires_at',
    type: 'datetime',
    nullable: true,
    comment: 'When the invitation expires',
  })
  expiresAt!: Date | null;
}
