import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('customer_task_members')
export class CustomerTaskMemberEntity {
  @PrimaryGeneratedColumn({
    name: 'customer_task_member_id',
    type: 'bigint',
    unsigned: true,
  })
  customerTaskMemberId!: number;

  @Column({
    name: 'task_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked task',
  })
  @Index('customer_task_members_task_id')
  taskId!: number;

  @Column({
    name: 'customer_id',
    type: 'bigint',
    unsigned: true,
    nullable: false,
    comment: 'Linked customer',
  })
  @Index('customer_task_members_customer_id')
  customerId!: number;

  @Column({
    name: 'role_id',
    type: 'int',
    unsigned: true,
    nullable: false,
    comment:
      "Role of the customer in the task like: 'customer_viewer', 'customer_contributor'",
  })
  roleId!: number;

  @CreateDateColumn({
    name: 'joined_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(6)',
    comment: 'When the customer joined the task',
  })
  joinedAt!: Date;
}
