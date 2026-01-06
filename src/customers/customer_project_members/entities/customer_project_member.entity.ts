import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('customer_project_members')
export class CustomerProjectMemberEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_project_member_id',
    type: 'bigint',
    unsigned: true,
  })
  customerProjectMemberId!: number;

  @Column({
    name: 'project_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked project',
  })
  @Index('customer_project_members_project_id')
  projectId!: number;

  @Column({
    name: 'customer_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked customer',
  })
  @Index('customer_project_members_customer_id')
  customerId!: number;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment:
      "Role of the customer in the project like: 'customer_viewer', 'customer_contributor'",
  })
  roleId!: number;

  @CreateDateColumn({
    name: 'joined_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the customer joined the project',
  })
  joinedAt!: Date;
}
