import { RpcException } from '@nestjs/microservices';
import {
  assertProcessTemplateStepRequirementAuthoringAllowed,
  isAllowedRequirementType,
  looksLikeFieldFormJsonSchema,
  requirementOverlapsStepBinding,
  suggestRequirementToBinding,
} from './process-step-requirement-authoring.validation';
import {
  PROCESS_STEP_REQUIREMENT_FIELD_FORM_OVERLAP_MESSAGE,
  PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE,
} from './process-step-requirement-policy.constants';

describe('process-step-requirement authoring validation', () => {
  const customerBinding = {
    configObjectId: 10,
    objectType: 'customer_profile',
    fieldKeys: ['first_name', 'last_name', 'email'],
  };

  it('allows gate requirement types', () => {
    expect(isAllowedRequirementType('approval')).toBe(true);
    expect(isAllowedRequirementType('payment')).toBe(true);
    expect(isAllowedRequirementType('external_attestation')).toBe(true);
    expect(isAllowedRequirementType('document')).toBe(false);
  });

  it('detects legacy field-form requirement types', () => {
    expect(looksLikeFieldFormJsonSchema({}, 'document')).toBe(true);
    expect(looksLikeFieldFormJsonSchema({}, 'form')).toBe(true);
  });

  it('detects multi-field json_schema as field form', () => {
    expect(
      looksLikeFieldFormJsonSchema({
        validator: 'jsonschema',
        schema: {
          type: 'object',
          properties: {
            first_name: { type: 'string' },
            last_name: { type: 'string' },
          },
        },
      }),
    ).toBe(true);
  });

  it('does not treat small approval gate schema as field form', () => {
    expect(
      looksLikeFieldFormJsonSchema(
        {
          validator: 'jsonschema',
          schema: {
            type: 'object',
            properties: {
              decision: { type: 'string', enum: ['approved', 'rejected'] },
              comment: { type: 'string' },
            },
          },
        },
        'approval',
      ),
    ).toBe(false);
  });

  it('detects overlap when requirement key matches binding object type', () => {
    expect(
      requirementOverlapsStepBinding(
        {
          processTemplateStepId: 1,
          requirementType: 'document',
          requirementKey: 'customer_profile',
          jsonSchema: {},
        },
        [customerBinding],
      ),
    ).toBe(true);
  });

  it('detects overlap when schema property keys match binding fields', () => {
    expect(
      requirementOverlapsStepBinding(
        {
          processTemplateStepId: 1,
          requirementType: 'form',
          requirementKey: 'profile_data',
          jsonSchema: {
            schema: {
              properties: {
                first_name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
        [customerBinding],
      ),
    ).toBe(true);
  });

  it('rejects disallowed requirement types when policy asserted', () => {
    expect(() =>
      assertProcessTemplateStepRequirementAuthoringAllowed(
        {
          processTemplateStepId: 1,
          requirementType: 'document',
          requirementKey: 'doc',
          jsonSchema: {},
        },
        [],
      ),
    ).toThrow(new RpcException(PROCESS_STEP_REQUIREMENT_TYPE_NOT_ALLOWED_MESSAGE));
  });

  it('rejects field-form overlap when policy asserted', () => {
    expect(() =>
      assertProcessTemplateStepRequirementAuthoringAllowed(
        {
          processTemplateStepId: 1,
          requirementType: 'approval',
          requirementKey: 'customer_profile',
          jsonSchema: {
            schema: {
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
              },
            },
          },
        },
        [customerBinding],
      ),
    ).toThrow(
      new RpcException(PROCESS_STEP_REQUIREMENT_FIELD_FORM_OVERLAP_MESSAGE),
    );
  });

  it('suggests binding + completion_rule from legacy requirement', () => {
    const suggestion = suggestRequirementToBinding({
      processTemplateStepRequirementId: 5,
      processTemplateStepId: 1,
      requirementType: 'document',
      requirementKey: 'customer_profile',
      jsonSchema: {
        autoApproveOnValid: true,
        schema: {
          properties: {
            first_name: { type: 'string' },
            email: { type: 'string' },
          },
        },
      },
      bindings: [customerBinding],
      tenantConfigObjects: [
        {
          configObjectId: 10,
          objectType: 'customer_profile',
          fieldKeys: customerBinding.fieldKeys,
        },
      ],
    });

    expect(suggestion).toMatchObject({
      suggestedConfigObjectId: 10,
      suggestedObjectType: 'customer_profile',
      confidence: 'high',
      suggestedBinding: {
        bindingMode: 'create_on_enter',
        completionRule: { type: 'payload_valid', minStatus: 'PUBLISHED' },
      },
      fieldKeyOverlap: expect.arrayContaining(['first_name', 'email']),
    });
  });
});
