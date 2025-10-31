import { Inject, Injectable } from '@nestjs/common';
import { AJV } from './ajv.module';

export type RequirementEnvelope = {
  version?: string;
  validator?: 'jsonschema';
  autoApproveOnValid?: boolean;
  schema: object;
};

@Injectable()
export class RequirementValidationService {
  private cache = new Map<string, any>(); // key: `${reqInstanceId}:${updatedAtTs}`

  constructor(@Inject(AJV) private readonly ajv: any) {}

  private getValidator(cacheKey: string, env: RequirementEnvelope) {
    let validate = this.cache.get(cacheKey);
    if (!validate) {
      validate = this.ajv.compile(env.schema);
      this.cache.set(cacheKey, validate);
    }
    return validate;
  }

  validateSubmission(
    requirementInstanceId: number,
    updatedAt: Date,
    jsonSchemaEnvelope: RequirementEnvelope,
    submittedData: any,
  ) {
    const key = `${requirementInstanceId}:${+updatedAt}`;
    const validate = this.getValidator(key, jsonSchemaEnvelope);
    const ok = validate(submittedData);
    return {
      valid: !!ok,
      errors: ok ? [] : (validate.errors ?? []),
      autoApprove: !!jsonSchemaEnvelope.autoApproveOnValid && !!ok,
    };
  }
}
