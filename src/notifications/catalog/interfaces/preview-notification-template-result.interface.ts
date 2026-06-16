export interface PreviewNotificationTemplateResult {
  subject: string | null;
  message: string;
  referencedPaths: string[];
  missingPaths: string[];
  unknownPaths: string[];
  missingRequired: string[];
}
