import { MEDIA_OWNER_SCOPES, type MediaOwnerScope } from './media-ownership';
import { MediaErrorCode } from './media-error-codes';
import { RpcException } from '@nestjs/microservices';

/**
 * Caller context for media ACL (from Gateway RPC payload).
 */
export interface MediaCallerContext {
  userId: number | string;
  /** Active tenant when operating in tenant scope. */
  tenantId?: number | string | null;
  /** When true, platform-scoped paths are allowed. */
  isPlatformAdmin?: boolean;
}

/**
 * Parse ownership from a canonical media path.
 * Expected: `{scope}/{ownerId}/{objectType}/{fieldKey}/{filename}`
 */
export function parseMediaPathOwnership(path: string): {
  scope: MediaOwnerScope;
  ownerId: string;
  objectType: string;
  fieldKey: string;
} | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 5) {
    return null;
  }
  const [scopeRaw, ownerId, objectType, fieldKey] = parts;
  const scope = scopeRaw.toLowerCase();
  if (!(MEDIA_OWNER_SCOPES as readonly string[]).includes(scope)) {
    return null;
  }
  return {
    scope: scope as MediaOwnerScope,
    ownerId,
    objectType,
    fieldKey,
  };
}

/**
 * Enforce that the caller may access a media path under its ownership scope.
 */
export function assertCallerMayAccessPath(
  path: string,
  caller: MediaCallerContext,
): void {
  const parsed = parseMediaPathOwnership(path);
  if (!parsed) {
    // Legacy / non-canonical paths: allow if authenticated (permission still required).
    if (caller.userId === undefined || caller.userId === null || caller.userId === '') {
      throw new RpcException({
        code: MediaErrorCode.Forbidden,
        message: 'Unauthenticated media access',
      });
    }
    return;
  }

  const userId = String(caller.userId);
  const tenantId =
    caller.tenantId != null && caller.tenantId !== ''
      ? String(caller.tenantId)
      : null;

  switch (parsed.scope) {
    case 'platform':
      if (!caller.isPlatformAdmin) {
        throw new RpcException({
          code: MediaErrorCode.Forbidden,
          message: 'Platform media requires platform admin',
        });
      }
      break;
    case 'tenant':
      if (!tenantId || parsed.ownerId !== tenantId) {
        throw new RpcException({
          code: MediaErrorCode.Forbidden,
          message: 'Cross-tenant media access is forbidden',
        });
      }
      break;
    case 'user':
      if (parsed.ownerId !== userId) {
        throw new RpcException({
          code: MediaErrorCode.Forbidden,
          message: 'Cross-user media access is forbidden',
        });
      }
      break;
    case 'customer':
    case 'entity':
      // Fine-grained membership checks can be added later; require auth + matching
      // tenant when tenantId is present on the path's sibling context via gateway.
      if (caller.userId === undefined || caller.userId === null || caller.userId === '') {
        throw new RpcException({
          code: MediaErrorCode.Forbidden,
          message: 'Unauthenticated media access',
        });
      }
      break;
    default:
      throw new RpcException({
        code: MediaErrorCode.Forbidden,
        message: 'Unknown media ownership scope',
      });
  }
}

/**
 * Enforce that the caller may write under the requested ownership for start-upload.
 */
export function assertCallerMayWriteOwnership(
  ownership: {
    scope: MediaOwnerScope;
    ownerId: string;
  },
  caller: MediaCallerContext,
): void {
  const syntheticPath = `${ownership.scope}/${ownership.ownerId}/_/uploads/x.bin`;
  assertCallerMayAccessPath(syntheticPath, caller);
}
