import 'reflect-metadata';

import { getSorFieldDescriptors } from './sor-field-descriptors.registry';
import { SOR_BOUND_OBJECT_TYPE_ENTITIES } from './sor-bound-object-type-entities';
import { getEntityScalarColumnPropertyNames } from './core-field-descriptor/entity-column-metadata.util';
import { generateBaseCoreFieldDescriptorsFromSorRegistry } from './core-field-descriptor/core-field-descriptor.generator';
import { mergeWriteSchemaCapabilities } from './core-field-descriptor/core-field-descriptor.write-schema';

/**
 * A-5 — CI drift: SoR registry keys vs TypeORM entity columns, and inferred write
 * flags vs SoR `readOnly` markers (object-designer-authoring plan).
 */
describe('SoR registry drift (A-5)', () => {
  const objectTypes = Object.keys(SOR_BOUND_OBJECT_TYPE_ENTITIES);

  it('every SoR fieldKey maps to a scalar column on the bound entity', () => {
    const failures: string[] = [];

    for (const objectType of objectTypes) {
      const EntityClass = SOR_BOUND_OBJECT_TYPE_ENTITIES[objectType];
      const columnNames = getEntityScalarColumnPropertyNames(EntityClass);
      const sorFields = getSorFieldDescriptors(objectType);

      for (const d of sorFields) {
        if (!columnNames.has(d.fieldKey)) {
          failures.push(
            `${objectType}.${d.fieldKey}: not found on ${EntityClass.name} columns`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('mergeWriteSchemaCapabilities respects SoR readOnly for writable flags', () => {
    for (const objectType of objectTypes) {
      const sor = getSorFieldDescriptors(objectType);
      const base = generateBaseCoreFieldDescriptorsFromSorRegistry(objectType);
      const capped = mergeWriteSchemaCapabilities(base, {
        bindingMode: 'sor_bound',
        objectType,
      });

      for (const d of capped) {
        const sorRow = sor.find((s) => s.fieldKey === d.fieldKey);
        if (sorRow?.readOnly === true) {
          expect(d.canCreate).toBe(false);
          expect(d.canUpdate).toBe(false);
        } else if (sorRow) {
          expect(d.canCreate).toBe(true);
          expect(d.canUpdate).toBe(true);
        }
      }
    }
  });
});
