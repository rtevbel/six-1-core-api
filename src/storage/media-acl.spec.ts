import {
  assertCallerMayAccessPath,
  assertCallerMayWriteOwnership,
  parseMediaPathOwnership,
} from './media-acl';
import { MediaErrorCode } from './media-error-codes';

describe('media-acl', () => {
  it('parses canonical path ownership', () => {
    expect(
      parseMediaPathOwnership('tenant/42/invoice/attachments/abc.pdf'),
    ).toEqual({
      scope: 'tenant',
      ownerId: '42',
      objectType: 'invoice',
      fieldKey: 'attachments',
    });
  });

  it('allows matching tenant access', () => {
    expect(() =>
      assertCallerMayAccessPath('tenant/42/invoice/attachments/abc.pdf', {
        userId: 1,
        tenantId: '42',
      }),
    ).not.toThrow();
  });

  it('forbids cross-tenant access', () => {
    try {
      assertCallerMayAccessPath('tenant/42/invoice/attachments/abc.pdf', {
        userId: 1,
        tenantId: '99',
      });
      fail('expected forbidden');
    } catch (err: unknown) {
      const payload =
        typeof (err as { getError?: () => unknown }).getError === 'function'
          ? (err as { getError: () => unknown }).getError()
          : err;
      expect(payload).toEqual(
        expect.objectContaining({ code: MediaErrorCode.Forbidden }),
      );
    }
  });

  it('requires platform admin for platform scope', () => {
    expect(() =>
      assertCallerMayWriteOwnership(
        { scope: 'platform', ownerId: 'global' },
        { userId: 1, isPlatformAdmin: false },
      ),
    ).toThrow();
    expect(() =>
      assertCallerMayWriteOwnership(
        { scope: 'platform', ownerId: 'global' },
        { userId: 1, isPlatformAdmin: true },
      ),
    ).not.toThrow();
  });

  it('enforces user scope ownership', () => {
    expect(() =>
      assertCallerMayAccessPath('user/7/exports/report/a.xlsx', {
        userId: 7,
      }),
    ).not.toThrow();
    expect(() =>
      assertCallerMayAccessPath('user/7/exports/report/a.xlsx', {
        userId: 8,
      }),
    ).toThrow();
  });
});
