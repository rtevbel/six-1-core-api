/** Max `limit` for roles list queries (catalog-backed dynamic list). */
export const ROLES_MAX_PAGE_SIZE = 500;

// ROLES CONTROLLER MESSAGE PATTERNS
export const MICROSERVICE_CREATE_ROLE_PATTERN = 'v0.1_create_role';
export const MICROSERVICE_FIND_ALL_ROLE_PATTERN = 'v0.1_find_all_role';
export const MICROSERVICE_FIND_ONE_ROLE_PATTERN = 'v0.1_find_one_role';
export const MICROSERVICE_UPDATE_ROLE_PATTERN = 'v0.1_update_role';
export const MICROSERVICE_REMOVE_ROLE_PATTERN = 'v0.1_remove_role';

export const MESSAGE_BROKER_ROLE_SERVICE_CLIENT_TOKEN = 'role_service_token';
