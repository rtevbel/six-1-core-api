// USERS CONTROLLER MESSAGE PATTERNS
export const MICROSERVICE_CREATE_USER_PATTERN = 'v0.1_create_user';
export const MICROSERVICE_FIND_ALL_USER_PATTERN = 'v0.1_find_all_user';
export const MICROSERVICE_FIND_ONE_USER_PATTERN = 'v0.1_find_one_user';
export const MICROSERVICE_UPDATE_USER_PATTERN = 'v0.1_update_user';
export const MICROSERVICE_REMOVE_USER_PATTERN = 'v0.1_remove_user';

export const MESSAGE_BROKER_AUTH_TOKEN = 'auth_service_token';

//Error message text
export const INVALID_CREDENTIALS_ERROR_MESSAGE = 'Invalid credentials!';
export const EMAIL_NOT_VERIFIED_ERROR_MESSAGE = 'Email not verified!';
export const EXPIRED_REFRESH_TOKEN_ERROR_MESSAGE = 'refresh token is expired!';
export const REDIS_USER_REFRESH_TOKEN_IDENTIFIER = 'refresh_token_{user_id}';
export const ENVIRONMENT_VARIABLE_NOT_FOUND_ERROR_MESSAGE =
  'No value found from environment file for you passed key:{key}.';
export const NOT_DEFINED_ERROR_MESSAGE = 'The passed value is not defined';

//Passport package text
export const CUSTOM_STRATEGY_IDENTIFIER = 'custom_strategy';
export const JWT_STRATEGY_IDENTIFIER = 'jwt_strategy';
export const LOCAL_STRATEGY_IDENTIFIER = 'local_strategy';
export const GOOGLE_OIDC_IDENTIFIER = 'GoogleOidc';

//Message patterns
export const V0_1_AUTH_LOGIN_MESSAG_PATTERN = 'v0.1_login';
export const V0_1_AUTH_REFRESH_TOKEN_MESSAG_PATTERN = 'v0.1_refresh_token';
export const V0_1_AUTH_REVOKE_REFRESH_TOKEN_MESSAG_PATTERN =
  'v0.1_revoke_refresh_token';
export const V0_1_AUTH_USER_PROFILE_MESSAG_PATTERN = 'v0.1_get_profile';
export const DEFAULT_ENVIRONMENT_FILE_NAME = '.env.production';
export const REDIS_CLIENT_TYPE = 'single';

//Redis
export const REDIS_DATABASE_URL_KEY = 'REDIS_URL';
export const REDIS_DATABASE_PASSWORD_KEY = 'REDIS_PASSWORD';
export const REDIS_DATABASE_HOST_KEY = 'REDIS_HOST';
export const REDIS_DATABASE_PORT_KEY = 'REDIS_PORT';

export const JWT_SECRET_KEY = 'JWT_SECRET_KEY';
export const JWT_EXPIRATION_TIME_KEY = 'JWT_EXPIRATION_TIME';
export const JWT_REFRESH_TOKEN_SECRET_KEY = 'JWT_REFRESH_TOKEN_SECRET_KEY';
export const JWT_REFRESH_TOKEN_EXPIRATION_TIME =
  'JWT_REFRESH_TOKEN_SEXPIRATION_TIME';
