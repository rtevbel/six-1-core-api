import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';
import {AppLanguagesEnum} from "../../common/enums/app-languages.enum";

@Entity('role_descriptions')
export class RoleDescriptionEntity {
  @PrimaryGeneratedColumn()
  role_description_id!: number;

  @Column()
  role_id!: number;

  @Column()
  language_id: number = AppLanguagesEnum.English;

  @Column()
  name!: string;

  @Column()
  description?: string;

  @Column()
  created_by: number = 0;

  @Column()
  updated_by: number = 0;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  created_at!: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
    select: false,
  })
  updated_at!: Date;

  @ManyToOne(() => RoleEntity, (role) => role.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'role_id',
  })
  role!: RoleEntity;
}
