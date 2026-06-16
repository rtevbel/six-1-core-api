import { applyFieldMapToLegacyVariables } from './notification-legacy-entity-fields.util';

describe('notification-legacy-entity-fields.util', () => {
  it('maps resolved fields onto legacy flat keys when missing', () => {
    const variables: Record<string, unknown> = { projectId: 1 };

    applyFieldMapToLegacyVariables(
      variables,
      { name: 'Alpha', projectIdentifier: 'pro-alpha' },
      {
        projectName: 'name',
        projectIdentifier: 'projectIdentifier',
      },
    );

    expect(variables).toEqual({
      projectId: 1,
      projectName: 'Alpha',
      projectIdentifier: 'pro-alpha',
    });
  });

  it('does not overwrite existing legacy values', () => {
    const variables: Record<string, unknown> = {
      projectName: 'Existing',
    };

    applyFieldMapToLegacyVariables(
      variables,
      { name: 'Alpha' },
      { projectName: 'name' },
    );

    expect(variables.projectName).toBe('Existing');
  });
});
