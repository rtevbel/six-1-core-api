import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isProcessSubjectType } from '../../automation/process-subject.constants';

/**
 * Validates subjectType against the allowed process subject vocabulary.
 */
@ValidatorConstraint({ name: 'isProcessSubjectType', async: false })
export class IsProcessSubjectTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return typeof value === 'string' && isProcessSubjectType(value);
  }

  defaultMessage(): string {
    return 'subjectType must be a supported process subject type';
  }
}
