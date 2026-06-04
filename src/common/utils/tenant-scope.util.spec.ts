import {
  getEffectiveTenantId,
  processTemplateWhereForTenantScope,
  resolveProcessTemplateStoredTenantId,
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
      expect(resolveProcessTemplateStoredTenantId(undefined)).toBe(0);
    });

    it('keeps positive tenant ids', () => {
      expect(resolveProcessTemplateStoredTenantId(12)).toBe(12);
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
