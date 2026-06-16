export interface TemplateRenderResult {
  subject: string | null;
  message: string;
  missingRequired: string[];
}
