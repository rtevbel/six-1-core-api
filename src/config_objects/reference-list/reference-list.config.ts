import { ConfigService } from '@nestjs/config';
import { REFERENCE_LIST_STRICT_VALIDATION_KEY } from './reference-list.constants';

const TRUTHY = new Set(['true', '1', 'yes', 'on']);

/**
 * Returns whether unknown lookup `dataRef` tokens should hard-fail on field save.
 * Set `REFERENCE_LIST_STRICT_VALIDATION=true` in production; leave unset in dev/UAT to warn only.
 */
export function isReferenceListStrictValidationEnabled(
  configService: ConfigService,
): boolean {
  const raw = configService
    .get<string>(REFERENCE_LIST_STRICT_VALIDATION_KEY)
    ?.trim()
    .toLowerCase();
  return raw !== undefined && raw.length > 0 && TRUTHY.has(raw);
}
