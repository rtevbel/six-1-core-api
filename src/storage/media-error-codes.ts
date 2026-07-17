/** Stable error codes for media RPCs (Gateway can map to HTTP). */
export const MediaErrorCode = {
  TooLarge: 'MEDIA_TOO_LARGE',
  TypeNotAllowed: 'MEDIA_TYPE_NOT_ALLOWED',
  Forbidden: 'MEDIA_FORBIDDEN',
  NotFound: 'MEDIA_NOT_FOUND',
  CloudFailure: 'MEDIA_CLOUD_FAILURE',
  InvalidPath: 'MEDIA_INVALID_PATH',
  MaxFiles: 'MEDIA_MAX_FILES',
  InvalidOwnership: 'MEDIA_INVALID_OWNERSHIP',
} as const;

export type MediaErrorCodeValue =
  (typeof MediaErrorCode)[keyof typeof MediaErrorCode];
