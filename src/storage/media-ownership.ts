import * as crypto from 'crypto';

/**
 * Ownership scopes for media object keys.
 * Paths are ownership-scoped (not tenant-only).
 */
export const MEDIA_OWNER_SCOPES = [
  'platform',
  'tenant',
  'customer',
  'user',
  'entity',
] as const;

export type MediaOwnerScope = (typeof MEDIA_OWNER_SCOPES)[number];

/**
 * Describes who owns a media object and where it logically belongs.
 */
export interface MediaOwnership {
  scope: MediaOwnerScope;
  /** Scope-specific id (e.g. tenant id, user id, `global` for platform). */
  ownerId: string;
  /** Logical object / feature type (e.g. invoice, task_attachment). */
  objectType: string;
  /** Optional field key within the object; defaults to `uploads`. */
  fieldKey?: string;
  /** Optional record id when known (null on create-before-record). */
  recordId?: string | null;
}

export interface GenerateMediaPathInput {
  ownership: MediaOwnership;
  filename: string;
}

/**
 * Canonical path:
 * `{scope}/{ownerId}/{objectType}/{fieldKey|uploads}/{uuid}.{ext}`
 */
export function buildMediaPath(input: GenerateMediaPathInput): string {
  const { ownership, filename } = input;
  const scope = ownership.scope?.trim().toLowerCase();
  const ownerId = ownership.ownerId?.trim();
  const objectType = ownership.objectType?.trim();
  const fieldKey = (ownership.fieldKey?.trim() || 'uploads').replace(
    /^\/+|\/+$/g,
    '',
  );

  if (!scope || !(MEDIA_OWNER_SCOPES as readonly string[]).includes(scope)) {
    throw new Error(`Invalid media ownership scope: ${ownership.scope}`);
  }
  if (!ownerId) {
    throw new Error('Media ownership ownerId is required');
  }
  if (!objectType) {
    throw new Error('Media ownership objectType is required');
  }
  if (
    ownerId.includes('/') ||
    objectType.includes('/') ||
    fieldKey.includes('/')
  ) {
    throw new Error('Media ownership segments must not contain "/"');
  }

  const ext =
    (filename.includes('.')
      ? filename.split('.').pop()?.toLowerCase()
      : undefined) || 'bin';
  const uuid = crypto.randomUUID();

  return [scope, ownerId, objectType, fieldKey, `${uuid}.${ext}`]
    .join('/')
    .replace(/\/+/g, '/');
}

/** Ownership prefix used for ACL prefix checks (without filename). */
export function buildMediaOwnershipPrefix(ownership: MediaOwnership): string {
  const fieldKey = (ownership.fieldKey?.trim() || 'uploads').replace(
    /^\/+|\/+$/g,
    '',
  );
  return [
    ownership.scope.trim().toLowerCase(),
    ownership.ownerId.trim(),
    ownership.objectType.trim(),
    fieldKey,
  ].join('/');
}

export function pathMatchesOwnershipPrefix(
  path: string,
  ownership: MediaOwnership,
): boolean {
  const prefix = buildMediaOwnershipPrefix(ownership);
  return path === prefix || path.startsWith(`${prefix}/`);
}
