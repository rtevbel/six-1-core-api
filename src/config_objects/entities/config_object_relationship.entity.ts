import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Entity class for `config_object_relationships` table.
 *
 * Describes how configurable objects relate to each other (e.g. project → tasks),
 * including cardinality and a JSON query configuration used to fetch related data.
 */
@Entity('config_object_relationships')
export class ConfigObjectRelationshipEntity {
  @PrimaryGeneratedColumn({
    name: 'config_object_relationship_id',
    type: 'bigint',
    unsigned: true,
  })
  configObjectRelationshipId!: number;

  @Column({
    name: 'from_object_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  fromObjectType!: string;

  @Column({
    name: 'to_object_type',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  toObjectType!: string;

  @Column({
    name: 'relationship_key',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  relationshipKey!: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  displayName!: string;

  @Column({
    name: 'cardinality',
    type: 'enum',
    enum: ['one_to_many', 'many_to_one', 'many_to_many'],
    default: 'one_to_many',
  })
  cardinality!: 'one_to_many' | 'many_to_one' | 'many_to_many';

  @Column({
    name: 'query_config',
    type: 'json',
    nullable: false,
  })
  queryConfig!: Record<string, unknown>;

  @Column({
    name: 'is_active',
    type: 'tinyint',
    unsigned: true,
    default: 1,
  })
  isActive!: boolean;
}

