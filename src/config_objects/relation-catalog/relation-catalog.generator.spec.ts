import { generateOrmRelationDescriptorsForObjectType } from './relation-catalog.generator';

describe('generateOrmRelationDescriptorsForObjectType', () => {
  it('derives role_descriptions and junction-lifted role_permissions', () => {
    const rows = generateOrmRelationDescriptorsForObjectType('role');
    const keys = rows.map((r) => r.relationshipKey);
    expect(keys).toContain('role_descriptions');
    expect(keys).toContain('role_permissions');
  });

  it('returns empty for unknown object type', () => {
    expect(generateOrmRelationDescriptorsForObjectType('unknown_type')).toEqual(
      [],
    );
  });
});
