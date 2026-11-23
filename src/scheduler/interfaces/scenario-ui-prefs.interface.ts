import { PlanningLensId } from '../constants';

export interface ScenarioUiPrefsPanels {
  resources?: boolean;
  equipment?: boolean;
  material?: boolean;
  subcontractors?: boolean;
  map?: boolean;
}

/** Closed envelope stored on `schedule_scenarios.ui_prefs`. */
export interface ScenarioUiPrefs {
  planningLensId?: PlanningLensId;
  advancedKpis?: boolean;
  linkBoards?: boolean;
  panels?: ScenarioUiPrefsPanels;
  theme?: string | null;
  language?: string | null;
}

export interface ScenarioUiPrefsView {
  scheduleScenarioId: number;
  tenantId: number;
  revision: number;
  uiPrefs: ScenarioUiPrefs | null;
}
