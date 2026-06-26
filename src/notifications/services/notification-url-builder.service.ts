import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LOCAL_PUBLIC_BASE_URL,
  NOTIFICATION_PUBLIC_BASE_URL_KEY,
  CONFIG_OBJECT_VERIFICATION_URL_REGISTRY_KEY,
} from '../../common/constants';
import { buildConfigObjectVerificationUrl } from '../../config_objects/verification/config-object-verification-url.util';
import { parseVerificationUrlRegistryFromConfig } from '../../config_objects/verification/config-object-verification-url.registry';

/**
 * NotificationUrlBuilderService
 *
 * Builds frontend URLs for notifications.
 */
@Injectable()
export class NotificationUrlBuilderService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * @deprecated Use {@link buildVerificationUrl} with `tenant_user` (registry path).
   */
  buildEmailVerificationUrl(token: string): string | null {
    return this.buildVerificationUrl('tenant_user', token);
  }

  /**
   * Builds a login URL.
   * @returns Login URL or null.
   */
  buildLoginUrl(): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    return `${base}/signin`;
  }

  /**
   * Builds a tenant user invitation acceptance URL.
   * @param token - Invitation token.
   * @returns Invitation URL or null.
   */
  buildTenantUserInvitationUrl(token: string): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;

    const url = new URL(`${base}/accept-invitation`);
    url.searchParams.set('token', token);

    return url.toString();
  }

  /**
   * Builds a resend invitation URL (management screen).
   * @param email - Invited email address.
   * @returns Resend invitation URL or null.
   */
  buildResendInvitationUrl(email: string): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    const url = new URL(`${base}/tenant/users`);
    url.searchParams.set('tab', 'invitations');
    url.searchParams.set('email', email);
    return url.toString();
  }

  /**
   * Builds a project detail URL.
   * @param projectId - Project ID.
   * @returns Project URL or null.
   */
  buildProjectUrl(projectId: number): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    return `${base}/projects/${projectId}`;
  }

  /**
   * Builds a task detail URL.
   * @param taskId - Task ID.
   * @returns Task URL or null.
   */
  buildTaskUrl(taskId: number): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    return `${base}/tasks/${taskId}`;
  }

  /**
   * Builds a comment URL within a task.
   * @param taskId - Task ID.
   * @param commentId - Comment ID.
   * @returns Comment URL or null.
   */
  buildCommentUrl(taskId: number, commentId: number): string | null {
    const taskUrl = this.buildTaskUrl(taskId);
    if (!taskUrl) return null;
    return `${taskUrl}#comment-${commentId}`;
  }

  /**
   * Builds a team detail URL.
   * @param teamId - Team ID.
   * @returns Team URL or null.
   */
  buildTeamUrl(teamId: number): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    return `${base}/tenant/teams/${teamId}`;
  }

  /**
   * Builds a Process Runner URL for a process instance.
   * @param processInstanceId - Process instance ID.
   */
  buildProcessRunnerUrl(processInstanceId: number): string | null {
    const base = this.getBaseUrl();
    if (!base) return null;
    return `${base}/process-instances/${processInstanceId}/runner`;
  }

  /**
   * Builds a generic config-object email verification URL (Phase 5 registry).
   */
  buildVerificationUrl(objectType: string, token: string): string | null {
    return buildConfigObjectVerificationUrl(
      this.getBaseUrl(),
      objectType,
      token,
      this.getVerificationUrlRegistry(),
    );
  }

  private getVerificationUrlRegistry(): Record<string, string> | null {
    return parseVerificationUrlRegistryFromConfig(
      this.configService.get<string>(
        CONFIG_OBJECT_VERIFICATION_URL_REGISTRY_KEY,
      ),
    );
  }

  /**
   * Resolves the public base URL for frontend links.
   */
  private getBaseUrl(): string | null {
    const notificationBaseUrl = this.configService.get<string>(
      NOTIFICATION_PUBLIC_BASE_URL_KEY,
    );
    const fallbackBaseUrl =
      this.configService.get<string>(LOCAL_PUBLIC_BASE_URL) ?? null;
    const baseUrl = notificationBaseUrl ?? fallbackBaseUrl;

    if (!baseUrl) {
      return null;
    }

    return baseUrl.replace(/\/+$/, '');
  }
}
