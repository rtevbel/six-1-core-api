import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  BeforeUpdate,
  OneToMany,
} from 'typeorm';
import { Expose } from 'class-transformer';
import { hash_content } from '../../common/functions';
import { UserRoleEntity } from './user-role.entity';
import { UserPasswordEntity } from '../../user-passwords/entities/user-password.entity';
import { UserLoginTokenEntity } from '../../user-login-tokens/entities/user-login-token.entity';

/**
 * User entity class.
 *
 * Version:1.0.0.
 *
 * This user entity class is used,
 * in TypeORM to map application data to,
 * database table and vice versa.
 *
 */
@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  user_id!: number;

  @Column()
  first_name!: string;

  @Column()
  last_name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  username!: string;

  @Column({ select: true })
  password!: string;

  @Column({
    default: 0,
    select: false,
  })
  login_num: number = 0;

  @Column({
    select: false,
  })
  rp_token: string = '';

  @Column({
    select: false,
    type:"datetime",
    nullable:true,
    default:null
  })
  rp_token_created_at?: string|null;

  @Column({ default:1})
  interface_locale:number = 1;

  @Column({
    default: true,
    select: true,
  })
  is_active: boolean = true;

  @Column({
    default: false,
    select: false,
  })
  is_deleted: boolean = false;

  @Column({
    default: false,
    select: false,
  })
  is_blocked: boolean = false;

  @Column({ type: 'datetime', nullable: true, default: null , select:false})
  block_date?:string|null;
  
  @Column() 
  extra: string = '';

  @Column({ select: false })
  created_by: number = 0;

  @Column({ select: false })
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

  @Expose()
  get full_name(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await hash_content(this.password);
    }
  }

  @OneToMany(() => UserRoleEntity, (role) => role.user, {
    cascade: true, // Handle relational operation automatically (e.g. add/update/delete) user's roles data.
    onDelete: 'CASCADE', // Delete child rows when parent is deleted
    orphanedRowAction: 'delete', // Automatically delete orphaned row
    eager: true, // With this earger attribute true the TypeOrm will load the user's roles without passing the relations in find query.
  })
  user_roles!: UserRoleEntity[];

  @OneToMany(() => UserPasswordEntity, (user_password) => user_password.user, {
    cascade: true, // Handle relational operation automatically (e.g. add/update/delete) user's passwords data.
    onDelete: 'CASCADE', // Delete child rows when parent is deleted
    orphanedRowAction: 'delete', // Automatically delete orphaned row
    eager: false, // With this earger attribute true the TypeOrm will load the user's passwords without passing the relations in find query.
  })
  user_passwords!: UserPasswordEntity[];

  @OneToMany(() => UserLoginTokenEntity, (user_token) => user_token.user, {
    cascade: true,
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
    eager: false,
  })
  user_tokens!: UserLoginTokenEntity[];
}
