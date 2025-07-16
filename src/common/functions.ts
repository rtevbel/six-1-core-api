import * as bcrypt from 'bcrypt';
import { NotFoundException } from '@nestjs/common';
import {
  ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE,
  NOT_DEFINED_ERROR_MESSAGE,
} from './constants';

/**
 * Hashes the provided content using bcrypt.
 *
 * @version 0.0.1
 *
 * @param {string} content - The string content to be hashed.
 * @returns {Promise<string>} - A hashed version of the content.
 */
export async function hash_content(content: string): Promise<string> {
  const salt = await bcrypt.genSalt();
  return await bcrypt.hash(content, salt);
}

/**
 * Compares a plain text string with a hashed string to check if they match.
 *
 * @version 0.0.1
 *
 * @param {string} content - The original plain text content.
 * @param {string} hashedString - The hashed string to compare against.
 * @returns {Promise<boolean>} - Returns `true` if the content matches the hash, otherwise `false`.
 */
export async function compare_hashed_content(
  content: string,
  hashedString: string,
): Promise<boolean> {
  return bcrypt.compare(content, hashedString);
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
