import {
  EMPTY_SHEET_EXTRAS,
  PlannerSheetExtras,
  PlannerSheetMaterialRef,
  PlannerSheetPredecessor,
} from '../interfaces/planner-sheet-extras.interface';
import { DependencyType } from '../entities/task_dependency.entity';

const DEP_TYPES: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];
const MAX_SKILLS = 32;
const MAX_SKILL_LEN = 64;
const MAX_KEYS = 64;
const MAX_PREDECESSORS = 64;

function asStringArray(
  raw: unknown,
  maxItems: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim().slice(0, maxLen);
    if (!trimmed) continue;
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function asMaterials(raw: unknown): PlannerSheetMaterialRef[] {
  if (!Array.isArray(raw)) return [];
  const out: PlannerSheetMaterialRef[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const recordKey =
      typeof (item as { recordKey?: unknown }).recordKey === 'string'
        ? (item as { recordKey: string }).recordKey.trim()
        : '';
    if (!recordKey) continue;
    const qtyRaw = (item as { qty?: unknown }).qty;
    const qty =
      typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)
        ? Math.max(0, qtyRaw)
        : Number(qtyRaw);
    out.push({
      recordKey: recordKey.slice(0, 64),
      qty: Number.isFinite(qty) && qty >= 0 ? qty : 0,
    });
    if (out.length >= MAX_KEYS) break;
  }
  return out;
}

function asPredecessors(raw: unknown): PlannerSheetPredecessor[] {
  if (!Array.isArray(raw)) return [];
  const out: PlannerSheetPredecessor[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const dependsOnTaskId = Number(
      (item as { dependsOnTaskId?: unknown }).dependsOnTaskId,
    );
    if (!Number.isFinite(dependsOnTaskId) || dependsOnTaskId <= 0) continue;
    const typeRaw = (item as { dependencyType?: unknown }).dependencyType;
    const dependencyType = DEP_TYPES.includes(typeRaw as DependencyType)
      ? (typeRaw as DependencyType)
      : 'FS';
    const lagRaw = (item as { lagDays?: unknown }).lagDays;
    const lagDays =
      typeof lagRaw === 'number' && Number.isFinite(lagRaw)
        ? Math.trunc(lagRaw)
        : Number(lagRaw);
    out.push({
      dependsOnTaskId,
      dependencyType,
      lagDays: Number.isFinite(lagDays) ? lagDays : 0,
    });
    if (out.length >= MAX_PREDECESSORS) break;
  }
  return out;
}

/** Normalize unknown JSON / DTO into a closed sheet-extras envelope. */
export function normalizeSheetExtras(
  raw: unknown | null | undefined,
): PlannerSheetExtras {
  if (raw == null || typeof raw !== 'object') {
    return { ...EMPTY_SHEET_EXTRAS };
  }
  const src = raw as Record<string, unknown>;
  return {
    requiredSkills: asStringArray(src.requiredSkills, MAX_SKILLS, MAX_SKILL_LEN),
    partnerRecordKeys: asStringArray(src.partnerRecordKeys, MAX_KEYS, 64),
    requiredMaterials: asMaterials(src.requiredMaterials),
    requiredEquipmentRecordKeys: asStringArray(
      src.requiredEquipmentRecordKeys,
      MAX_KEYS,
      64,
    ),
    assignedEquipmentRecordKeys: asStringArray(
      src.assignedEquipmentRecordKeys,
      MAX_KEYS,
      64,
    ),
    predecessors: asPredecessors(src.predecessors),
  };
}

export function sheetExtrasFromEntity(
  raw: Record<string, unknown> | PlannerSheetExtras | null | undefined,
): PlannerSheetExtras | null {
  if (raw == null) return null;
  return normalizeSheetExtras(raw);
}
