export interface ProcessTemplateStepUiExtension {
  icon?: string;
  color?: string;
  helpText?: string;
  groupName?: string;
}

/**
 * Runner authoring extensions stored in `process_template_steps.step_extensions_json`.
 * `requiredPermissions` may also be set here; persisted on `required_permissions`.
 */
export interface ProcessTemplateStepExtensionView {
  visibleWhen?: Record<string, unknown> | null;
  allowSkip?: boolean;
  autoAdvanceWhen?: Record<string, unknown> | null;
  parallelGroupId?: string | null;
  ui?: ProcessTemplateStepUiExtension | null;
  requiredPermissions?: string[] | null;
}

export interface ProcessTemplateStepExtensionResponse {
  processTemplateStepId: number;
  extensions: ProcessTemplateStepExtensionView;
}
