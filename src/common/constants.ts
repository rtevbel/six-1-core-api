export const NO_RECORD_FOUND_MESSAGE = 'No record found for {entity_name}.';

export const NO_RECORD_FOUND_FOR_PASSED_FILTERS_MESSAGE =
  'No {entity_name} record found.Please change filter params.';

//Message broker constats
export const MESSAGE_BROKER_USERNAME_KEY = 'MESSAGE_BROKER_USERNAME';
export const MESSAGE_BROKER_PASSWORD_KEY = 'MESSAGE_BROKER_PASSWORD';
export const MESSAGE_BROKER_HOST_KEY = 'MESSAGE_BROKER_HOST';
export const MESSAGE_BROKER_PORT_KEY = 'MESSAGE_BROKER_PORT';
export const MESSAGE_BROKER_URL_KEY = 'MESSAGE_BROKER_URL';
export const SERVICE_MESSAGE_BROKER_QUEUE_NAME_KEY =
  'SERVICE_MESSAGE_BROKER_QUEUE_NAME';

//Error messages
export const ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE =
  'No value found from environment file for you passed key:{key}.';
export const NOT_DEFINED_ERROR_MESSAGE = 'The passed value is not defined';

export const DEFAULT_ENVIRONMENT_FILE_NAME = '.env.production';
export const DATABASE_SERVICE_TYPE = 'mysql';

//MYSQL database constats
export const MYSQL_DATABASE_HOST_NAME_KEY = 'SIX1_CORE_API_DB_HOST';
export const MYSQL_DATABASE_PORT_KEY = 'SIX1_CORE_API_DB_PORT';
export const MYSQL_DATABASE_USER_NAME_KEY = 'SIX1_CORE_API_DB_USERNAME';
export const MYSQL_DATABASE_PASSWORD_KEY = 'SIX1_CORE_API_DB_PASSWORD';
export const MYSQL_DATABASE_NAME_KEY = 'SIX1_CORE_API_DB_DATABASE';

//Storage constats
export const STORAGE_DRIVER = 'SIX1_STORAGE_DRIVER';

// R2 (Cloudflare)
export const R2_ACCOUNT_ID = 'SIX1_R2_ACCOUNT_ID';
export const R2_ACCESS_KEY_ID = 'SIX1_R2_ACCESS_KEY_ID';
export const R2_SECRET_ACCESS_KEY = 'SIX1_R2_SECRET_ACCESS_KEY';
export const R2_BUCKET = 'SIX1_R2_BUCKET';

//AWS S3 (if STORAGE_DRIVER=s3)
export const S3_REGION = 'SIX1_S3_REGION';
export const S3_ACCESS_KEY_ID = 'SIX1_S3_ACCESS_KEY_ID';
export const S3_SECRET_ACCESS_KEY = 'SIX1_S3_SECRET_ACCESS_KEY';
export const S3_BUCKET = 'SIX1_S3_BUCKET';

//Local (if STORAGE_DRIVER=local)
export const LOCAL_STORAGE_DIR = 'SIX1_LOCAL_STORAGE_DIR';
export const LOCAL_PUBLIC_BASE_URL = 'SIX1_LOCAL_PUBLIC_BASE_URL';
