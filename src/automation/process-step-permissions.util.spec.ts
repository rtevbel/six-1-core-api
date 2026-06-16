import { normalizeRequiredPermissions } from './process-step-permissions.util';

describe('normalizeRequiredPermissions', () => {
  it('returns trimmed non-empty strings', () => {
    expect(
      normalizeRequiredPermissions([
        ' process_templates.update ',
        'config.manage',
      ]),
    ).toEqual(['process_templates.update', 'config.manage']);
  });

  it('returns empty array for invalid input', () => {
    expect(normalizeRequiredPermissions(null)).toEqual([]);
    expect(normalizeRequiredPermissions({})).toEqual([]);
    expect(normalizeRequiredPermissions(['', 1, null])).toEqual([]);
  });
});
