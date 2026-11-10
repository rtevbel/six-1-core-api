import { ManageRecordCategory } from '../constants';
import { PlannerManageFieldDescriptor } from '../interfaces/planner-manage.interface';

function field(
  fieldKey: string,
  label: string,
  dataType: PlannerManageFieldDescriptor['dataType'],
  opts: {
    required?: boolean;
    maxLength?: number;
    enumValues?: string[];
    path?: string;
  } = {},
): PlannerManageFieldDescriptor {
  return {
    fieldKey,
    label,
    dataType,
    required: opts.required ?? false,
    maxLength: opts.maxLength,
    enumValues: opts.enumValues,
    path:
      opts.path ??
      (fieldKey === 'name' ||
      fieldKey === 'parentRecordKey' ||
      fieldKey === 'linkedMasterId'
        ? fieldKey
        : `attrs.${fieldKey}`),
  };
}

const CORE = {
  name: field('name', 'Name', 'string', { required: true, maxLength: 255 }),
  parentRecordKey: field('parentRecordKey', 'Parent project', 'uuid', {
    required: false,
    path: 'parentRecordKey',
  }),
  linkedMasterId: field('linkedMasterId', 'Linked master id', 'integer', {
    required: false,
    path: 'linkedMasterId',
  }),
};

export const PLANNER_MANAGE_CATEGORY_FIELDS: Record<
  ManageRecordCategory,
  PlannerManageFieldDescriptor[]
> = {
  project: [
    CORE.name,
    CORE.parentRecordKey,
    field('customer', 'Customer', 'string', { maxLength: 255 }),
    field('location', 'Location', 'string', { maxLength: 255 }),
    field('buildingArea', 'Building / area', 'string', { maxLength: 255 }),
    CORE.linkedMasterId,
  ],
  person: [
    CORE.name,
    field('hoursPerDay', 'Hours per day', 'number'),
    field('region', 'Region', 'string', { maxLength: 64 }),
    field('skills', 'Skills', 'string_array', { maxLength: 64 }),
    field('absent', 'Absent', 'boolean'),
    field('tenantUserId', 'Tenant user id', 'integer'),
    CORE.linkedMasterId,
  ],
  team: [
    CORE.name,
    field('memberRecordKeys', 'Members', 'uuid_array'),
    field('hoursPerDay', 'Hours per day', 'number'),
    field('region', 'Region', 'string', { maxLength: 64 }),
    CORE.linkedMasterId,
  ],
  partner: [
    CORE.name,
    field('discipline', 'Discipline', 'string', { maxLength: 128 }),
    field('crews', 'Crews', 'number'),
    field('status', 'Status', 'enum', {
      enumValues: ['ready', 'committed', 'at_risk'],
    }),
    CORE.linkedMasterId,
  ],
  equipment: [
    CORE.name,
    field('status', 'Status', 'enum', {
      enumValues: ['available', 'reserved', 'maintenance'],
    }),
    field('projectRecordKey', 'Project', 'uuid'),
    CORE.linkedMasterId,
  ],
  material: [
    CORE.name,
    field('stock', 'Stock', 'number'),
    field('reserved', 'Reserved', 'number'),
    field('etaUtc', 'Delivery date', 'datetime'),
    field('projectRecordKey', 'Project', 'uuid'),
    CORE.linkedMasterId,
  ],
};

export function getManageCategoryFields(
  category: ManageRecordCategory,
): PlannerManageFieldDescriptor[] {
  return PLANNER_MANAGE_CATEGORY_FIELDS[category];
}
