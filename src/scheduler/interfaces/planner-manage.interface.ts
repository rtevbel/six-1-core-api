import { ManageRecordCategory } from '../constants';

export interface PlannerManageRecordView {
  scheduleScenarioManageRecordId: number;
  recordKey: string;
  category: ManageRecordCategory;
  name: string;
  parentRecordKey: string | null;
  linkedMasterId: number | null;
  attrs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/** Object Runner–compatible field descriptor for Manage scenario-draft forms. */
export interface PlannerManageFieldDescriptor {
  fieldKey: string;
  label: string;
  dataType:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'enum'
    | 'uuid'
    | 'uuid_array'
    | 'string_array'
    | 'datetime';
  required: boolean;
  maxLength?: number;
  enumValues?: string[];
  /** Where the value lives on upsert payload (`name` vs `attrs.x`). */
  path: string;
}

export interface PlannerManageCategoryCatalogEntry {
  category: ManageRecordCategory;
  tabLabel: string;
  /** Canonical Object Designer objectType for this category. */
  objectType: string;
  /** Canonical Dynamic Process key for this category. */
  processKey: string;
  /** Published process template English name (seed pack). */
  processTemplateName: string;
  /** Platform template set key hosting the config objects. */
  templateSetKey: string;
  bindingMode: 'scenario_draft';
  runnerKind: 'scenario_draft';
  /** Object Designer binding for the authored form object (seeded standalone). */
  configObjectBindingMode: 'standalone';
  fieldSchemaSource: 'manage_draft_attrs';
  resolveInstanceWith: 'recordKey';
  fields: PlannerManageFieldDescriptor[];
  crudPatterns: {
    list: string;
    upsert: string;
    remove: string;
    resolve: string;
    schema: string;
    catalog: string;
  };
  /** Always false under Option A until Commit to live. */
  writesLiveMaster: false;
}

export interface PlannerManageCatalogView {
  bindingMode: 'scenario_draft';
  runnerKind: 'scenario_draft';
  categories: PlannerManageCategoryCatalogEntry[];
  /**
   * Tasks tab is not a Manage upsert category — open planner task sheet.
   */
  tasksTab: {
    tabLabel: 'Tasks';
    upsertViaManage: false;
    openTaskSheet: true;
  };
}

export interface PlannerManageSchemaView {
  category: ManageRecordCategory;
  objectType: string;
  processKey: string;
  processTemplateName: string;
  templateSetKey: string;
  bindingMode: 'scenario_draft';
  runnerKind: 'scenario_draft';
  fields: PlannerManageFieldDescriptor[];
  writesLiveMaster: false;
}

export interface PlannerManageResolveView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number;
  revision: number;
  runnerKind: 'scenario_draft';
  resolveInstanceWith: 'recordKey';
  item: PlannerManageRecordView;
  /** Flat map for Runner forms: name + attrs (+ parent/linked). */
  values: Record<string, unknown>;
}

export interface PlannerManageListView {
  tenantId: number;
  schedulingRequirementId: number;
  scheduleScenarioId: number;
  revision: number;
  items: PlannerManageRecordView[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PlannerManageUpsertView {
  tenantId: number;
  scheduleScenarioId: number;
  revision: number;
  item: PlannerManageRecordView;
}

export interface PlannerManageRemoveView {
  tenantId: number;
  scheduleScenarioId: number;
  revision: number;
  recordKey: string;
  removed: true;
}
