/**
 * Response for `v0.1_verify_config_object_email`.
 */
export interface VerifyConfigObjectEmailResult {
  success: boolean;
  objectType: string;
  coreId?: number;
  emailVerified?: boolean;
  message?: string;
  changedFields?: string[];
  rateLimited?: boolean;
  retryAfterSeconds?: number;
}
