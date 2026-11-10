import { ManageRecordCategory } from '../constants';
import { PlannerManageCategoryCatalogEntry } from '../interfaces/planner-manage.interface';
import {
  PLANNER_MANAGE_PACK,
  PLANNER_MANAGE_TEMPLATE_SET_KEY,
} from '../seed/planner-manage-process-pack.seed';
import {
  getManageCategoryFields,
  PLANNER_MANAGE_CATEGORY_FIELDS,
} from './planner-manage-fields';

/**
 * Week 7 Phase 2 — canonical Object Designer / Dynamic Process keys and
 * Runner field schemas for Manage categories. CRUD persists via scenario-draft
 * Manage APIs (`schedule_scenario_manage_records`), not live SoR.
 */

const TAB_LABEL: Record<ManageRecordCategory, string> = {
  project: 'Projects',
  person: 'People',
  team: 'Teams',
  partner: 'Partners',
  equipment: 'Equipment',
  material: 'Materials',
};

const PACK_BY_CATEGORY = Object.fromEntries(
  PLANNER_MANAGE_PACK.map((p) => [p.category, p]),
) as Record<ManageRecordCategory, (typeof PLANNER_MANAGE_PACK)[number]>;

export const PLANNER_MANAGE_CRUD_PATTERNS = {
  list: 'v0.1_scheduler_planner_manage_list',
  upsert: 'v0.1_scheduler_planner_manage_upsert',
  remove: 'v0.1_scheduler_planner_manage_remove',
  resolve: 'v0.1_scheduler_planner_manage_resolve',
  schema: 'v0.1_scheduler_planner_manage_schema',
  catalog: 'v0.1_scheduler_planner_manage_catalog',
} as const;

export function buildManageCategoryCatalogEntry(
  category: ManageRecordCategory,
): PlannerManageCategoryCatalogEntry {
  const pack = PACK_BY_CATEGORY[category];
  return {
    category,
    tabLabel: TAB_LABEL[category],
    objectType: pack.objectType,
    processKey: pack.processKey,
    processTemplateName: pack.processTemplateName,
    templateSetKey: PLANNER_MANAGE_TEMPLATE_SET_KEY,
    bindingMode: 'scenario_draft',
    runnerKind: 'scenario_draft',
    configObjectBindingMode: 'standalone',
    fieldSchemaSource: 'manage_draft_attrs',
    resolveInstanceWith: 'recordKey',
    fields: PLANNER_MANAGE_CATEGORY_FIELDS[category],
    crudPatterns: { ...PLANNER_MANAGE_CRUD_PATTERNS },
    writesLiveMaster: false,
  };
}

export function listManageCategoryCatalog(): PlannerManageCategoryCatalogEntry[] {
  return PLANNER_MANAGE_PACK.map((p) =>
    buildManageCategoryCatalogEntry(p.category),
  );
}

export { getManageCategoryFields };
