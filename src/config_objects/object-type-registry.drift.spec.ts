import 'reflect-metadata';

import { resolveEntityClassForObjectType } from './core-field-descriptor/object-type-entity.registry';
import { resolveDtoPairForObjectType } from './core-field-descriptor/object-type-dto.registry';

/**
 * P8 — CI drift: entity registry resolves for deferred DTO write-cap types.
 */
describe('object-type registry drift (P8)', () => {
  const DEFERRED_DTO_OBJECT_TYPES = [
    'customer_meta',
    'project_meta',
    'task_meta',
    'resource_meta',
    'customer_contact_info_meta',
    'scheduled_tasks',
    'scheduled_task_events',
    'scheduled_task_history',
    'task_dependencies',
    'resource_assignment_shifts',
    'shared_projects',
    'shared_resources',
    'shared_tasks',
    'sharing_invitations',
    'sharing_logs',
  ] as const;

  it('deferred object types resolve to a TypeORM entity', () => {
    const failures: string[] = [];
    for (const objectType of DEFERRED_DTO_OBJECT_TYPES) {
      if (!resolveEntityClassForObjectType(objectType)) {
        failures.push(`${objectType}: no entity class in registry`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('deferred object types have create and update DTO pairs', () => {
    const failures: string[] = [];
    for (const objectType of DEFERRED_DTO_OBJECT_TYPES) {
      const pair = resolveDtoPairForObjectType(objectType);
      if (!pair?.createDto || !pair?.updateDto) {
        failures.push(`${objectType}: missing createDto and/or updateDto`);
      }
    }
    expect(failures).toEqual([]);
  });
});
