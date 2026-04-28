export interface RelationDescriptor {
  fromObjectType: string;
  toObjectType: string;
  relationshipKey: string;
  displayName: string;
  cardinality: 'one_to_many' | 'many_to_one' | 'many_to_many';
  relationshipSource: 'orm' | 'designer';
  isActive: boolean;
  queryConfig: Record<string, unknown>;
  relationManifestJson?: Record<string, unknown> | null;
}
