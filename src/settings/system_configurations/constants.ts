/**
 * System configurations / settings registry — message patterns and shared constants.
 */

export const SYSTEM_SETTING_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'enum',
  'json',
  'string_array',
  'number_array',
  'datetime',
  'duration',
  'url',
  'email',
  'secret',
] as const;

export type SystemSettingValueType =
  (typeof SYSTEM_SETTING_VALUE_TYPES)[number];

export const SYSTEM_SETTINGS_ENCRYPTION_KEY =
  'SYSTEM_SETTINGS_ENCRYPTION_KEY';

export const SYSTEM_SETTING_SECRET_MASK = '********';

/** Groups */
export const MICROSERVICE_CREATE_SYSTEM_SETTING_GROUP_PATTERN =
  'v0.1_create_system_setting_group';
export const MICROSERVICE_FIND_ALL_SYSTEM_SETTING_GROUPS_PATTERN =
  'v0.1_find_all_system_setting_groups';
export const MICROSERVICE_FIND_ONE_SYSTEM_SETTING_GROUP_PATTERN =
  'v0.1_find_one_system_setting_group';
export const MICROSERVICE_UPDATE_SYSTEM_SETTING_GROUP_PATTERN =
  'v0.1_update_system_setting_group';
export const MICROSERVICE_REMOVE_SYSTEM_SETTING_GROUP_PATTERN =
  'v0.1_remove_system_setting_group';

/** Definitions */
export const MICROSERVICE_CREATE_SYSTEM_SETTING_DEFINITION_PATTERN =
  'v0.1_create_system_setting_definition';
export const MICROSERVICE_FIND_ALL_SYSTEM_SETTING_DEFINITIONS_PATTERN =
  'v0.1_find_all_system_setting_definitions';
export const MICROSERVICE_FIND_ONE_SYSTEM_SETTING_DEFINITION_PATTERN =
  'v0.1_find_one_system_setting_definition';
export const MICROSERVICE_UPDATE_SYSTEM_SETTING_DEFINITION_PATTERN =
  'v0.1_update_system_setting_definition';
export const MICROSERVICE_REMOVE_SYSTEM_SETTING_DEFINITION_PATTERN =
  'v0.1_remove_system_setting_definition';

/** Values */
export const MICROSERVICE_SET_SYSTEM_SETTING_VALUE_PATTERN =
  'v0.1_set_system_setting_value';
export const MICROSERVICE_CLEAR_SYSTEM_SETTING_VALUE_PATTERN =
  'v0.1_clear_system_setting_value';
export const MICROSERVICE_FIND_SYSTEM_SETTING_VALUES_PATTERN =
  'v0.1_find_system_setting_values';

/** Resolve effective settings */
export const MICROSERVICE_RESOLVE_SYSTEM_SETTINGS_PATTERN =
  'v0.1_resolve_system_settings';

export const MESSAGE_BROKER_SYSTEM_CONFIGURATIONS_SERVICE_CLIENT_TOKEN =
  'system_configurations_service_token';
