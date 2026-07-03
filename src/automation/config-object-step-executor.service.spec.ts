import { DataSource } from 'typeorm';
import { ConfigObjectStepExecutor } from './config-object-step-executor.service';
import { EventsService } from '../events/events.service';
import { ProcessFeatureFlagsService } from './config/process-feature-flags.service';
import {
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_ACTIVE,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
  PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID,
} from './process-step-object-binding.constants';

jest.mock('../tenants/system-tenant.bootstrap', () => ({
  ...jest.requireActual('../tenants/system-tenant.bootstrap'),
  ensureSystemTenantRow: jest.fn().mockResolvedValue(undefined),
}));

import { ensureSystemTenantRow } from '../tenants/system-tenant.bootstrap';

describe('ConfigObjectStepExecutor', () => {
  const emit = jest.fn();
  const flags = { isConfigObjectStepsEnabled: jest.fn().mockReturnValue(true) };
  const configObjectsService = {
    resolveObjectInstance: jest.fn(),
    loadCoreRecord: jest.fn(),
  };
  const completenessService = {
    isBindingComplete: jest.fn(),
    buildFieldSnapshot: jest.fn(),
  };

  const managerQuery = jest.fn();
  const transaction = jest.fn(async (fn) => fn({ query: managerQuery }));

  const ds = {
    query: jest.fn(),
    transaction,
  } as unknown as DataSource;

  let executor: ConfigObjectStepExecutor;

  beforeEach(() => {
    jest.clearAllMocks();
    flags.isConfigObjectStepsEnabled.mockReturnValue(true);
    executor = new ConfigObjectStepExecutor(
      ds,
      { emit } as unknown as EventsService,
      flags as unknown as ProcessFeatureFlagsService,
      configObjectsService as never,
      completenessService as never,
    );
  });

  describe('areMandatoryBindingsValid', () => {
    it('returns true when flag is disabled', async () => {
      flags.isConfigObjectStepsEnabled.mockReturnValue(false);
      const em = { query: jest.fn() };
      await expect(
        executor.areMandatoryBindingsValid(em as never, 1),
      ).resolves.toBe(true);
      expect(em.query).not.toHaveBeenCalled();
    });

    it('returns false when mandatory bindings are not valid', async () => {
      const em = {
        query: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ blocking: 2 }]),
      };
      await expect(
        executor.areMandatoryBindingsValid(em as never, 5),
      ).resolves.toBe(false);
    });
  });

  describe('validateByCustomInstanceId', () => {
    it('marks binding valid and emits event when completion rule passes', async () => {
      managerQuery
        .mockResolvedValueOnce([
          {
            step_object_instance_id: 10,
            step_instance_id: 5,
            config_object_id: 99,
            binding_id: 11,
            tenant_id: 1,
            process_instance_id: 500,
            object_type: 'invoice_submission',
            completion_rule: { type: 'payload_valid' },
          },
        ])
        .mockResolvedValueOnce([
          { payload: { amount: 100 }, status: 'DRAFT' },
        ])
        .mockResolvedValueOnce(undefined);

      completenessService.isBindingComplete.mockResolvedValue({
        valid: true,
      });

      const result = await executor.validateByCustomInstanceId(77, 2, 'corr-1');

      expect(result).toEqual({ stepInstanceId: 5, valid: true });
      expect(managerQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE process_instance_step_object_instances'),
        expect.arrayContaining([PROCESS_INSTANCE_STEP_OBJECT_STATUS_VALID]),
      );
      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_step_object_validated',
        expect.objectContaining({
          data: expect.objectContaining({
            configCustomObjectInstanceId: 77,
            stepInstanceId: 5,
          }),
        }),
      );
    });
  });

  describe('provisionBindingsOnStepReady', () => {
    it('creates standalone instance rows for pending bindings', async () => {
      const qr = {
        manager: {
          query: jest
            .fn()
            .mockResolvedValueOnce([
              { tenant_id: 1, created_by: 2, process_instance_id: 500 },
            ])
            .mockResolvedValueOnce([
              {
                step_object_instance_id: 10,
                step_instance_id: 5,
                binding_id: 11,
                config_object_id: 99,
                config_custom_object_instance_id: null,
                core_id: null,
                status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
                binding_mode: 'create_on_enter',
                is_mandatory: 1,
                completion_rule: { type: 'payload_valid' },
                object_type: 'invoice_submission',
                config_binding_mode: 'standalone',
              },
            ])
            .mockResolvedValueOnce([
              { config_object_id: 99, binding_mode: 'standalone' },
            ])
            .mockResolvedValueOnce({ insertId: 77 })
            .mockResolvedValueOnce(undefined),
        },
      };

      await executor.provisionBindingsOnStepReady(qr as never, {
        stepInstanceId: 5,
      });

      expect(emit).toHaveBeenCalledWith(
        'six1-event.process_step_object_created',
        expect.objectContaining({
          data: expect.objectContaining({
            configCustomObjectInstanceId: 77,
          }),
        }),
      );
    });

    it('ensures system tenant exists before global-scope standalone provisioning', async () => {
      const qr = {
        manager: {
          query: jest
            .fn()
            .mockResolvedValueOnce([
              { tenant_id: 0, created_by: 1, process_instance_id: 50 },
            ])
            .mockResolvedValueOnce([
              {
                step_object_instance_id: 30,
                step_instance_id: 83,
                binding_id: 9,
                config_object_id: 6,
                config_custom_object_instance_id: null,
                core_id: null,
                status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
                binding_mode: 'create_on_enter',
                is_mandatory: 1,
                completion_rule: { type: 'payload_valid' },
                object_type: 'demo_intake',
                config_binding_mode: 'standalone',
              },
            ])
            .mockResolvedValueOnce([
              { config_object_id: 6, binding_mode: 'standalone' },
            ])
            .mockResolvedValueOnce({ insertId: 88 })
            .mockResolvedValueOnce(undefined),
        },
      };

      await executor.provisionBindingsOnStepReady(qr as never, {
        stepInstanceId: 83,
      });

      expect(ensureSystemTenantRow).toHaveBeenCalledWith(qr.manager);
    });

    it('defers sor_bound create_on_enter bindings without provisioning on step ready', async () => {
      const managerQuery = jest
        .fn()
        .mockResolvedValueOnce([
          {
            tenant_id: 0,
            created_by: 1,
            process_instance_id: 19,
            subject_type: 'workflow',
            subject_id: 19,
            subject_metadata: null,
            context: {
              customerName: 'Test Customer',
              customerEmail: 'test@example.com',
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            step_object_instance_id: 2,
            step_instance_id: 13,
            binding_id: 4,
            config_object_id: 3,
            config_custom_object_instance_id: null,
            core_id: null,
            status: PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
            binding_mode: 'create_on_enter',
            is_mandatory: 1,
            completion_rule: { type: 'payload_valid' },
            object_type: 'customer',
            config_binding_mode: 'sor_bound',
          },
        ]);

      const qr = { manager: { query: managerQuery } };

      await executor.provisionBindingsOnStepReady(qr as never, {
        stepInstanceId: 13,
      });

      expect(managerQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('SET core_id = ?'),
        expect.anything(),
      );
      expect(emit).not.toHaveBeenCalled();
    });

    it('resets failed deferred sor_bound bindings to pending on step ready', async () => {
      const managerQuery = jest
        .fn()
        .mockResolvedValueOnce([
          {
            tenant_id: 0,
            created_by: 1,
            process_instance_id: 19,
            subject_type: 'workflow',
            subject_id: 19,
            subject_metadata: null,
            context: {},
          },
        ])
        .mockResolvedValueOnce([
          {
            step_object_instance_id: 2,
            step_instance_id: 13,
            binding_id: 4,
            config_object_id: 3,
            config_custom_object_instance_id: null,
            core_id: null,
            status: 'failed',
            binding_mode: 'create_on_enter',
            is_mandatory: 1,
            completion_rule: { type: 'payload_valid' },
            object_type: 'customer',
            config_binding_mode: 'sor_bound',
          },
        ])
        .mockResolvedValueOnce(undefined);

      const qr = { manager: { query: managerQuery } };

      await executor.provisionBindingsOnStepReady(qr as never, {
        stepInstanceId: 13,
      });

      expect(managerQuery).toHaveBeenCalledWith(
        expect.stringContaining('SET status = ?'),
        expect.arrayContaining([
          PROCESS_INSTANCE_STEP_OBJECT_STATUS_PENDING,
          2,
        ]),
      );
    });
  });
});
