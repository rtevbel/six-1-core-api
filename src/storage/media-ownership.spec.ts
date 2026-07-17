import {
  buildMediaPath,
  buildMediaOwnershipPrefix,
  pathMatchesOwnershipPrefix,
} from './media-ownership';

describe('buildMediaPath', () => {
  it('builds ownership-scoped path', () => {
    const path = buildMediaPath({
      ownership: {
        scope: 'tenant',
        ownerId: '42',
        objectType: 'invoice',
        fieldKey: 'attachments',
      },
      filename: 'report.PDF',
    });
    expect(path).toMatch(/^tenant\/42\/invoice\/attachments\/[a-f0-9-]+\.pdf$/);
  });

  it('defaults fieldKey to uploads', () => {
    const path = buildMediaPath({
      ownership: {
        scope: 'platform',
        ownerId: 'global',
        objectType: 'branding',
      },
      filename: 'logo.png',
    });
    expect(path).toMatch(/^platform\/global\/branding\/uploads\/[a-f0-9-]+\.png$/);
  });

  it('rejects invalid scope', () => {
    expect(() =>
      buildMediaPath({
        ownership: {
          scope: 'invalid' as 'tenant',
          ownerId: '1',
          objectType: 'x',
        },
        filename: 'a.bin',
      }),
    ).toThrow(/scope/);
  });
});

describe('pathMatchesOwnershipPrefix', () => {
  it('matches generated prefix', () => {
    const ownership = {
      scope: 'user' as const,
      ownerId: '7',
      objectType: 'exports',
      fieldKey: 'report',
    };
    const prefix = buildMediaOwnershipPrefix(ownership);
    expect(pathMatchesOwnershipPrefix(`${prefix}/abc.xlsx`, ownership)).toBe(
      true,
    );
    expect(pathMatchesOwnershipPrefix('tenant/1/other/uploads/x', ownership)).toBe(
      false,
    );
  });
});
