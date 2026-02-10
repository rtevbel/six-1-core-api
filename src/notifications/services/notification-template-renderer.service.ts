import { Injectable } from '@nestjs/common';
import { EventVars } from '../../common/event-variables';

/**
 * Result payload for template rendering.
 */
export interface TemplateRenderResult {
  subject: string | null;
  message: string;
  missingRequired: string[];
}

/**
 * NotificationTemplateRendererService
 *
 * Renders template placeholders using event payload and metadata.
 */
@Injectable()
export class NotificationTemplateRendererService {
  /**
   * Renders subject and message templates with resolved variables.
   * @param eventName - Event name for variable requirements lookup.
   * @param subjectTemplate - Template string for subject.
   * @param messageTemplate - Template string for message body.
   * @param variables - Variable map for template rendering.
   * @returns Render result with missing required keys (if any).
   */
  render(
    eventName: string,
    subjectTemplate: string | null,
    messageTemplate: string,
    variables: Record<string, unknown>,
  ): TemplateRenderResult {
    const missingRequired = this.getMissingRequiredKeys(eventName, variables);

    const subject = subjectTemplate
      ? this.replacePlaceholders(subjectTemplate, variables)
      : null;
    const message = this.replacePlaceholders(messageTemplate, variables);

    return { subject, message, missingRequired };
  }

  /**
   * Resolves required variable keys that are missing.
   * @param eventName - Event name to resolve required keys.
   * @param variables - Variable map for template rendering.
   * @returns Array of missing required keys.
   */
  private getMissingRequiredKeys(
    eventName: string,
    variables: Record<string, unknown>,
  ): string[] {
    const required = EventVars?.[eventName as keyof typeof EventVars]?.required;
    if (!required) {
      return [];
    }

    return required.filter((key) => !this.hasValue(key, variables));
  }

  /**
   * Checks if a given key path has a usable value.
   * @param keyPath - Dot-notation key path.
   * @param variables - Variable map for template rendering.
   * @returns True when value is present and non-empty.
   */
  private hasValue(keyPath: string, variables: Record<string, unknown>): boolean {
    const value = this.getValueByPath(keyPath, variables);
    return value !== undefined && value !== null && value !== '';
  }

  /**
   * Replaces {{key}} placeholders with mapped values.
   * @param template - Template string with placeholders.
   * @param variables - Variable map for template rendering.
   * @returns Rendered string.
   */
  private replacePlaceholders(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    return template.replace(
      /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g,
      (match, key) => {
        const value = this.getValueByPath(key, variables);
        if (value === undefined || value === null) {
          return '';
        }
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          return String(value);
        }
        return JSON.stringify(value);
      },
    );
  }

  /**
   * Retrieves a nested value from a key path.
   * @param keyPath - Dot-notation key path.
   * @param variables - Variable map for template rendering.
   * @returns The resolved value or undefined.
   */
  private getValueByPath(
    keyPath: string,
    variables: Record<string, unknown>,
  ): unknown {
    if (!keyPath.includes('.')) {
      return variables[keyPath];
    }

    return keyPath
      .split('.')
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === 'object'
            ? (acc as Record<string, unknown>)[key]
            : undefined,
        variables,
      );
  }
}
