import type { SorMetaTableDescriptor } from '../sor-meta-table/sor-meta-table.registry';
import { getSorMetaTableDescriptor } from '../sor-meta-table/sor-meta-table.registry';

export type SorBoundMetaFieldLookupDescriptor = SorMetaTableDescriptor;

export function getSorBoundMetaFieldLookupDescriptor(
  objectType: string,
): SorBoundMetaFieldLookupDescriptor | null {
  return getSorMetaTableDescriptor(objectType);
}
