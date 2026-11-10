import { DependencyType } from '../entities/task_dependency.entity';

/** Required material qty on a planned task (Manage draft recordKey). */
export interface PlannerSheetMaterialRef {
  recordKey: string;
  qty: number;
}

/** Scenario-scoped predecessor on the task sheet (overlay). */
export interface PlannerSheetPredecessor {
  dependsOnTaskId: number;
  dependencyType: DependencyType;
  lagDays: number;
}

/**
 * Rich task sheet extras (UAT taskExtras) — overlay only.
 * Partners / equipment / materials reference Manage draft recordKeys.
 */
export interface PlannerSheetExtras {
  requiredSkills: string[];
  partnerRecordKeys: string[];
  requiredMaterials: PlannerSheetMaterialRef[];
  requiredEquipmentRecordKeys: string[];
  assignedEquipmentRecordKeys: string[];
  predecessors: PlannerSheetPredecessor[];
}

export const EMPTY_SHEET_EXTRAS: PlannerSheetExtras = {
  requiredSkills: [],
  partnerRecordKeys: [],
  requiredMaterials: [],
  requiredEquipmentRecordKeys: [],
  assignedEquipmentRecordKeys: [],
  predecessors: [],
};
