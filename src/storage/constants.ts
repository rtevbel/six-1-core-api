export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

// Legacy storage patterns (kept for compatibility)
export const MICROSERVICE_PRESIGN_UPLOAD_PATTERN = 'v0.1_presign_upload';
export const MICROSERVICE_PRESIGN_GET_PATTERN = 'v0.1_presign_get';
export const MICROSERVICE_PUT_FILE_PATTERN = 'v0.1_put_file';
export const MICROSERVICE_DELETE_FILE_PATTERN = 'v0.1_delete_file';
export const MICROSERVICE_START_DIRECT_UPLOAD_PATTERN =
  'storage.startDirectUpload';
export const MICROSERVICE_CONFIRM_DIRECT_UPLOAD_PATTERN =
  'storage.confirmDirectUpload';
export const MICROSERVICE_PRESIGN_DOWNLOAD_PATTERN = 'storage.presignDownload';

/** Canonical media RPCs — Gateway should proxy these. */
export const MICROSERVICE_MEDIA_START_UPLOAD_PATTERN = 'v0.1_media_start_upload';
export const MICROSERVICE_MEDIA_CONFIRM_UPLOAD_PATTERN =
  'v0.1_media_confirm_upload';
export const MICROSERVICE_MEDIA_PRESIGN_DOWNLOAD_PATTERN =
  'v0.1_media_presign_download';
export const MICROSERVICE_MEDIA_DELETE_PATTERN = 'v0.1_media_delete';
