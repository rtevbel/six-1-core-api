import { RpcException } from '@nestjs/microservices';
import {
  mergeStepExtensionJson,
  parseProcessTemplateStepExtension,
  readStepExtensionView,
} from './process-template-step-extension.validation';

describe('parseProcessTemplateStepExtension', () => {
  it('parses a full extension payload', () => {
    expect(
      parseProcessTemplateStepExtension({
        visibleWhen: { field: 'status', eq: 'active' },
        autoAdvanceWhen: { allComplete: true },
        allowSkip: false,
        parallelGroupId: ' group-a ',
        ui: { icon: 'check', helpText: 'Help' },
        requiredPermissions: ['process_steps.complete'],
      }),
    ).toEqual({
      visibleWhen: { field: 'status', eq: 'active' },
      autoAdvanceWhen: { allComplete: true },
      allowSkip: false,
      parallelGroupId: 'group-a',
      ui: { icon: 'check', helpText: 'Help' },
      requiredPermissions: ['process_steps.complete'],
    });
  });

  it('rejects invalid allowSkip', () => {
    expect(() =>
      parseProcessTemplateStepExtension({ allowSkip: 'yes' }),
    ).toThrow(RpcException);
  });

  it('clears parallelGroupId when blank string', () => {
    expect(
      parseProcessTemplateStepExtension({ parallelGroupId: '   ' }),
    ).toEqual({ parallelGroupId: null });
  });
});

describe('mergeStepExtensionJson', () => {
  it('merges patches and removes null keys', () => {
    const merged = mergeStepExtensionJson(
      { visibleWhen: { x: 1 }, allowSkip: true },
      { allowSkip: false, visibleWhen: null },
    );
    expect(merged).toEqual({ allowSkip: false });
  });

  it('preserves allowSkip false', () => {
    const merged = mergeStepExtensionJson({}, { allowSkip: false });
    expect(merged).toEqual({ allowSkip: false });
  });
});

describe('readStepExtensionView', () => {
  it('combines json column with required_permissions column', () => {
    expect(
      readStepExtensionView(
        { ui: { icon: 'star' }, allowSkip: true },
        ['process_templates.read'],
      ),
    ).toEqual({
      visibleWhen: null,
      autoAdvanceWhen: null,
      allowSkip: true,
      parallelGroupId: null,
      ui: { icon: 'star' },
      requiredPermissions: ['process_templates.read'],
    });
  });
});
