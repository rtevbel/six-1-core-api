import { PlannerPlanningPhase, ScenarioPlanningKind } from '../constants';
import { PlannerDockTemplateView } from '../interfaces/planner-phase-dock.interface';

/** Static v1 dock template catalog (tenant-admin later). */
export const PLANNER_DOCK_TEMPLATES: PlannerDockTemplateView[] = [
  {
    templateId: 'tpl-intake',
    phase: 'pre',
    title: 'Intake / kickoff',
    defaultDurHours: 4,
    planningKind: 'task',
  },
  {
    templateId: 'tpl-site-survey',
    phase: 'plan',
    title: 'Site survey',
    defaultDurHours: 8,
    planningKind: 'task',
  },
  {
    templateId: 'tpl-material-order',
    phase: 'logistics',
    title: 'Material order',
    defaultDurHours: 2,
    planningKind: 'task',
  },
  {
    templateId: 'tpl-delivery',
    phase: 'logistics',
    title: 'Delivery window',
    defaultDurHours: 4,
    planningKind: 'external',
  },
  {
    templateId: 'tpl-commissioning',
    phase: 'execute',
    title: 'Commissioning',
    defaultDurHours: 8,
    planningKind: 'task',
  },
  {
    templateId: 'tpl-install',
    phase: 'execute',
    title: 'Install',
    defaultDurHours: 16,
    planningKind: 'task',
  },
  {
    templateId: 'tpl-handover',
    phase: 'close',
    title: 'Handover / close-out',
    defaultDurHours: 4,
    planningKind: 'milestone',
  },
];

export function findDockTemplate(
  templateId: string,
): PlannerDockTemplateView | undefined {
  return PLANNER_DOCK_TEMPLATES.find((t) => t.templateId === templateId);
}

export function defaultPhase(): PlannerPlanningPhase {
  return 'plan';
}

export function isPlanningPhase(value: unknown): value is PlannerPlanningPhase {
  return (
    value === 'pre' ||
    value === 'plan' ||
    value === 'logistics' ||
    value === 'execute' ||
    value === 'close'
  );
}

export function normalizePlanningPhase(
  value: unknown,
): PlannerPlanningPhase {
  return isPlanningPhase(value) ? value : defaultPhase();
}

export function normalizeReadyPct(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function planningKindFromTemplate(
  kind: ScenarioPlanningKind,
): ScenarioPlanningKind {
  return kind;
}
