/**
 * Code-first SoR field descriptors for Object Runner list/form ordering and
 * allowlisted `corePatch` keys on `v0.1_apply_sor_bound_instance_patch`.
 *
 * Keep in sync with TypeORM entity property names (camelCase). Update this
 * registry when DTOs / columns change (see unified runner plan — drift control).
 */

export type SorFieldPrimitiveType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select'
  | 'json';

export interface SorFieldDescriptor {
  /** Entity property name; also the key in `corePatch` payloads */
  fieldKey: string;
  label: string;
  fieldType: SorFieldPrimitiveType;
  /** Relative order within SoR block (ascending) */
  orderIndex: number;
  /** If true, shown in schema but rejected in apply patch */
  readOnly?: boolean;
}

/** Product rule: SoR block precedes designer `config_object_fields` everywhere */
export const CONFIG_OBJECT_FIELD_MERGE_POLICY = {
  order: 'sor_first_then_custom' as const,
};

export interface MergedConfigFieldOrderEntry {
  source: 'sor' | 'custom';
  fieldKey: string;
  configObjectFieldId?: number;
}

const PROJECT_SOR_FIELDS: SorFieldDescriptor[] = [
  {
    fieldKey: 'name',
    label: 'Name',
    fieldType: 'text',
    orderIndex: 10,
  },
  {
    fieldKey: 'description',
    label: 'Description',
    fieldType: 'textarea',
    orderIndex: 20,
  },
  {
    fieldKey: 'projectIdentifier',
    label: 'Project identifier',
    fieldType: 'text',
    orderIndex: 30,
  },
  {
    fieldKey: 'status',
    label: 'Status',
    fieldType: 'select',
    orderIndex: 40,
  },
  {
    fieldKey: 'isShared',
    label: 'Shared',
    fieldType: 'boolean',
    orderIndex: 50,
  },
  {
    fieldKey: 'parentProjectId',
    label: 'Parent project',
    fieldType: 'number',
    orderIndex: 60,
  },
  {
    fieldKey: 'projectId',
    label: 'Project ID',
    fieldType: 'number',
    orderIndex: 0,
    readOnly: true,
  },
  {
    fieldKey: 'tenantId',
    label: 'Tenant',
    fieldType: 'number',
    orderIndex: 1,
    readOnly: true,
  },
];

const TASK_SOR_FIELDS: SorFieldDescriptor[] = [
  { fieldKey: 'name', label: 'Name', fieldType: 'text', orderIndex: 10 },
  {
    fieldKey: 'description',
    label: 'Description',
    fieldType: 'textarea',
    orderIndex: 20,
  },
  {
    fieldKey: 'taskIdentifier',
    label: 'Task identifier',
    fieldType: 'text',
    orderIndex: 30,
  },
  {
    fieldKey: 'priority',
    label: 'Priority',
    fieldType: 'select',
    orderIndex: 40,
  },
  {
    fieldKey: 'estimatedDuration',
    label: 'Estimated duration',
    fieldType: 'number',
    orderIndex: 50,
  },
  {
    fieldKey: 'effortHours',
    label: 'Effort hours',
    fieldType: 'number',
    orderIndex: 60,
  },
  {
    fieldKey: 'parentTaskId',
    label: 'Parent task',
    fieldType: 'number',
    orderIndex: 70,
  },
  {
    fieldKey: 'statusControl',
    label: 'Status control',
    fieldType: 'select',
    orderIndex: 80,
  },
  {
    fieldKey: 'schedulingMode',
    label: 'Scheduling mode',
    fieldType: 'select',
    orderIndex: 90,
  },
  {
    fieldKey: 'taskId',
    label: 'Task ID',
    fieldType: 'number',
    orderIndex: 0,
    readOnly: true,
  },
  {
    fieldKey: 'tenantId',
    label: 'Tenant',
    fieldType: 'number',
    orderIndex: 1,
    readOnly: true,
  },
  {
    fieldKey: 'projectId',
    label: 'Project',
    fieldType: 'number',
    orderIndex: 2,
    readOnly: true,
  },
];

const CUSTOMER_SOR_FIELDS: SorFieldDescriptor[] = [
  {
    fieldKey: 'firstName',
    label: 'First name',
    fieldType: 'text',
    orderIndex: 10,
  },
  {
    fieldKey: 'lastName',
    label: 'Last name',
    fieldType: 'text',
    orderIndex: 20,
  },
  {
    fieldKey: 'email',
    label: 'Email',
    fieldType: 'text',
    orderIndex: 30,
    readOnly: true,
  },
  {
    fieldKey: 'isProfileCompleted',
    label: 'Profile completed',
    fieldType: 'boolean',
    orderIndex: 40,
  },
  {
    fieldKey: 'customerId',
    label: 'Customer ID',
    fieldType: 'number',
    orderIndex: 0,
    readOnly: true,
  },
];

const CUSTOMER_CONTACT_SOR_FIELDS: SorFieldDescriptor[] = [
  {
    fieldKey: 'secondaryEmail',
    label: 'Secondary email',
    fieldType: 'text',
    orderIndex: 10,
  },
  { fieldKey: 'phone', label: 'Phone', fieldType: 'text', orderIndex: 20 },
  {
    fieldKey: 'address',
    label: 'Address',
    fieldType: 'textarea',
    orderIndex: 30,
  },
  { fieldKey: 'city', label: 'City', fieldType: 'text', orderIndex: 40 },
  { fieldKey: 'state', label: 'State', fieldType: 'text', orderIndex: 50 },
  { fieldKey: 'country', label: 'Country', fieldType: 'text', orderIndex: 60 },
  {
    fieldKey: 'customerContactId',
    label: 'Contact ID',
    fieldType: 'number',
    orderIndex: 0,
    readOnly: true,
  },
  {
    fieldKey: 'customerId',
    label: 'Customer',
    fieldType: 'number',
    orderIndex: 1,
    readOnly: true,
  },
];

const RESOURCE_SOR_FIELDS: SorFieldDescriptor[] = [
  { fieldKey: 'name', label: 'Name', fieldType: 'text', orderIndex: 10 },
  {
    fieldKey: 'description',
    label: 'Description',
    fieldType: 'textarea',
    orderIndex: 20,
  },
  {
    fieldKey: 'type',
    label: 'Type',
    fieldType: 'select',
    orderIndex: 30,
  },
  {
    fieldKey: 'tenantUserId',
    label: 'Tenant user',
    fieldType: 'number',
    orderIndex: 40,
  },
  {
    fieldKey: 'isShared',
    label: 'Shared',
    fieldType: 'boolean',
    orderIndex: 50,
  },
  {
    fieldKey: 'resourceId',
    label: 'Resource ID',
    fieldType: 'number',
    orderIndex: 0,
    readOnly: true,
  },
  {
    fieldKey: 'tenantId',
    label: 'Tenant',
    fieldType: 'number',
    orderIndex: 1,
    readOnly: true,
  },
];

const byObjectType: Record<string, SorFieldDescriptor[]> = {
  project: PROJECT_SOR_FIELDS,
  task: TASK_SOR_FIELDS,
  customer: CUSTOMER_SOR_FIELDS,
  customer_contact: CUSTOMER_CONTACT_SOR_FIELDS,
  resource: RESOURCE_SOR_FIELDS,
};

export function getSorFieldDescriptors(objectType: string): SorFieldDescriptor[] {
  return byObjectType[objectType] ?? [];
}

/** Keys allowed in `corePatch` (excludes read-only descriptors). */
export function getWritableSorFieldKeys(objectType: string): Set<string> {
  const keys = new Set<string>();
  for (const d of getSorFieldDescriptors(objectType)) {
    if (!d.readOnly) {
      keys.add(d.fieldKey);
    }
  }
  return keys;
}

export function buildMergedFieldOrder(
  objectType: string,
  customFields: { configObjectFieldId: number; fieldKey: string; orderIndex: number; sectionKey: string | null }[],
): MergedConfigFieldOrderEntry[] {
  const sor = [...getSorFieldDescriptors(objectType)].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const merged: MergedConfigFieldOrderEntry[] = sor.map((d) => ({
    source: 'sor' as const,
    fieldKey: d.fieldKey,
  }));

  const sortedCustom = [...customFields].sort((a, b) => {
    const sa = a.sectionKey ?? '';
    const sb = b.sectionKey ?? '';
    if (sa !== sb) {
      return sa.localeCompare(sb);
    }
    return a.orderIndex - b.orderIndex;
  });

  for (const f of sortedCustom) {
    merged.push({
      source: 'custom',
      fieldKey: f.fieldKey,
      configObjectFieldId: f.configObjectFieldId,
    });
  }

  return merged;
}
