import {
  bindingModeToRunnerKind,
  runnerMetadataForBindingMode,
} from './config-object-runner';

describe('config-object-runner', () => {
  describe('bindingModeToRunnerKind', () => {
    it('maps system_table to system_entity', () => {
      expect(bindingModeToRunnerKind('system_table')).toBe('system_entity');
    });

    it('passes through sor_bound and standalone', () => {
      expect(bindingModeToRunnerKind('sor_bound')).toBe('sor_bound');
      expect(bindingModeToRunnerKind('standalone')).toBe('standalone');
    });

    it('defaults undefined to sor_bound', () => {
      expect(bindingModeToRunnerKind(undefined)).toBe('sor_bound');
    });
  });

  describe('runnerMetadataForBindingMode', () => {
    it('describes sor_bound', () => {
      expect(runnerMetadataForBindingMode('sor_bound')).toEqual({
        runnerKind: 'sor_bound',
        supportsCustomFields: true,
        resolveInstanceWith: 'coreId',
        fieldSchemaSource: 'sor_plus_custom',
      });
    });

    it('describes standalone', () => {
      expect(runnerMetadataForBindingMode('standalone')).toEqual({
        runnerKind: 'standalone',
        supportsCustomFields: true,
        resolveInstanceWith: 'instanceId',
        fieldSchemaSource: 'custom_only',
      });
    });

    it('describes system_table', () => {
      expect(runnerMetadataForBindingMode('system_table')).toEqual({
        runnerKind: 'system_entity',
        supportsCustomFields: false,
        resolveInstanceWith: 'none',
        fieldSchemaSource: 'external_dto',
      });
    });
  });
});
