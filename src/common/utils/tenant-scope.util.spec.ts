import { RpcException } from '@nestjs/microservices';

import {
  configScopeTenantId,
  getEffectiveTenantId,
  isGlobalSystemTenantId,
  processTemplateWhereForTenantScope,
  resolveProcessTemplateStoredTenantId,
  resolveStoredTenantId,
  GLOBAL_SYSTEM_TENANT_ID,
} from './tenant-scope.util';

describe('tenant-scope.util', () => {
  describe('getEffectiveTenantId', () => {
    it('returns null when tenant is omitted (super-admin)', () => {
      expect(getEffectiveTenantId(undefined)).toBeNull();
      expect(getEffectiveTenantId(0)).toBeNull();
    });

    it('returns positive tenant id for tenant scope', () => {
      expect(getEffectiveTenantId(10)).toBe(10);
    });
  });

  describe('resolveProcessTemplateStoredTenantId', () => {
    it('maps global scope to tenant id 0', () => {
      expect(resolveProcessTemplateStoredTenantId(undefined)).toBe(
        GLOBAL_SYSTEM_TENANT_ID,
      );
    });

    it('keeps positive tenant ids', () => {
      expect(resolveProcessTemplateStoredTenantId(12)).toBe(12);
    });
  });

  describe('isGlobalSystemTenantId', () => {
    it('returns true only for global system tenant id', () => {
      expect(isGlobalSystemTenantId(0)).toBe(true);
      expect(isGlobalSystemTenantId(1)).toBe(false);
    });
  });

  describe('resolveStoredTenantId', () => {
    it('accepts system tenant 0 and positive tenant ids', () => {
      expect(resolveStoredTenantId(0)).toBe(0);
      expect(resolveStoredTenantId(12)).toBe(12);
    });

    it('rejects null, undefined, negative, and non-finite values', () => {
      const expectRejected = (value: number | null | undefined) => {
        expect(() => resolveStoredTenantId(value)).toThrow(RpcException);
        expect(() => resolveStoredTenantId(value)).toThrow(
          'tenantId is required.',
        );
      };

      expectRejected(undefined);
      expectRejected(null);
      expectRejected(-1);
      expectRejected(Number.NaN);
      expectRejected(Number.POSITIVE_INFINITY);
    });
  });

  describe('configScopeTenantId', () => {
    it('maps system tenant 0 to global config scope', () => {
      expect(configScopeTenantId(0)).toBeNull();
    });

    it('keeps positive tenant ids for config scope', () => {
      expect(configScopeTenantId(12)).toBe(12);
    });
  });

  describe('processTemplateWhereForTenantScope', () => {
    it('matches by id only for super-admin', () => {
      expect(processTemplateWhereForTenantScope(3, null)).toEqual({
        processTemplateId: 3,
      });
    });

    it('includes tenant id for tenant admins', () => {
      expect(processTemplateWhereForTenantScope(3, 10)).toEqual({
        processTemplateId: 3,
        tenantId: 10,
      });
    });
  });
});
