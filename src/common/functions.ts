import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import {
  ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE,
  NOT_DEFINED_ERROR_MESSAGE,
} from './constants';

/**
 * Hash Content
 * @param data
 * @returns Promise
 */
export async function hash_content(data: any): Promise<any> {
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(data, salt);
}

/**
 * Compare Hashed Content
 * @param hashed_content
 * @param content_to_compare
 * @returns
 */
export async function compare_hashed_content(
  hashed_content: any,
  content_to_compare: any,
): Promise<Boolean> {
  return await bcrypt.compare(content_to_compare, hashed_content);
}

/**
 * Ensures a configuration parameter is defined and not null or undefined.
 * Throws a `NotFoundException` if the parameter is missing.
 *
 * @version 0.0.1
 *
 * @template T
 * @param {T | null | undefined} value - The value to verify.
 * @param {string} [key] - The key name of the missing configuration (optional).
 * @param {string} [errorMessage] - A custom error message (optional).
 * @returns {T} - Returns the provided value if it's defined.
 *
 * @throws {NotFoundException} - Throws a `NotFoundException` with a custom error message.
 */
export function ensureDefinedConfigParam<T>(
  value: T | null | undefined,
  key?: string,
  errorMessage?: string,
): T {
  if (value === null || value === undefined) {
    if (errorMessage && key) {
      errorMessage = errorMessage.replace('{key}', key);
    } else if (key) {
      errorMessage = ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE.replace(
        '{key}',
        key,
      );
    } else {
      errorMessage = ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE.replace(
        ':{key}',
        '',
      );
    }
    throw new NotFoundException(errorMessage);
  }
  return value;
}

/**
 * Ensures that a value is defined and not null or undefined.
 * Throws a generic `Error` if the value is missing.
 *
 * @version 0.0.1
 *
 * @template T
 * @param {T | null | undefined} value - The value to verify.
 * @param {string} [errorMessage] - A custom error message (optional).
 * @returns {T} - Returns the provided value if it's defined.
 *
 * @throws {Error} - Throws an `Error` with a custom error message.
 */
export function ensureDefined<T>(
  value: T | null | undefined,
  errorMessage?: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage || NOT_DEFINED_ERROR_MESSAGE);
  }
  return value;
}

/**
 * Build Task URL
 * @param projectSlug
 * @param taskId
 * @returns
 */

export function buildTaskUrl(projectSlug: string, taskId: string) {
  const APP_WEB_URL = ensureDefinedConfigParam(
    process.env.APP_WEB_URL,
    'APP_WEB_URL',
  );
  return `${APP_WEB_URL}/p/${projectSlug}/t/${taskId}`;
}

/**
 * Build Project URL
 * @param projectSlug
 * @returns
 */

export function buildProjectUrl(projectSlug: string) {
  const APP_WEB_URL = ensureDefinedConfigParam(
    process.env.APP_WEB_URL,
    'APP_WEB_URL',
  );
  return `${APP_WEB_URL}/p/${projectSlug}`;
}
