export interface TemplateRenderResult {
  subject: string | null;
  message: string;
  /** Dot-paths referenced in the template that are empty after render. */
  missingRequired: string[];
}
