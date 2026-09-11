import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { SchedulingRequirementMemberType } from '../constants';
import { SchedulingRequirementEntity } from './scheduling_requirement.entity';

@Entity('scheduling_requirement_members')
@Unique('uq_sched_req_member', [
  'schedulingRequirementId',
  'memberType',
  'memberId',
])
export class SchedulingRequirementMemberEntity {
  @PrimaryGeneratedColumn({
    name: 'scheduling_requirement_member_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementMemberId!: number;

  @Index('idx_sched_req_member_req')
  @Column({
    name: 'scheduling_requirement_id',
    type: 'bigint',
    unsigned: true,
  })
  schedulingRequirementId!: number;

  @Column({
    name: 'member_type',
    type: 'enum',
    enum: ['project', 'task'],
  })
  memberType!: SchedulingRequirementMemberType;

  @Column({ name: 'member_id', type: 'bigint', unsigned: true })
  memberId!: number;

  @ManyToOne(() => SchedulingRequirementEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduling_requirement_id' })
  requirement!: SchedulingRequirementEntity;
}
