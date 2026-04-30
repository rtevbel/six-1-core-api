// CONFIG OBJECTS CONTROLLER MESSAGE PATTERNS

/**
 * Message pattern used to fetch the configuration schema for a given
 * object type within a tenant.
 */
export const MICROSERVICE_GET_CONFIG_SCHEMA_PATTERN =
  'v0.1_get_config_schema';

/**
 * Message pattern used to list configuration objects for a tenant and
 * optional template set.
 */
export const MICROSERVICE_LIST_CONFIG_OBJECTS_PATTERN =
  'v0.1_list_config_objects';

/**
 * Message pattern used to create a new configuration object within a
 * template set.
 */
export const MICROSERVICE_CREATE_CONFIG_OBJECT_PATTERN =
  'v0.1_create_config_object';

/**
 * Message pattern used to update an existing configuration object.
 */
export const MICROSERVICE_UPDATE_CONFIG_OBJECT_PATTERN =
  'v0.1_update_config_object';

/**
 * Message pattern used to delete an existing configuration object.
 */
export const MICROSERVICE_DELETE_CONFIG_OBJECT_PATTERN =
  'v0.1_delete_config_object';

/**
 * Message pattern used to list configuration fields for a given config
 * object.
 */
export const MICROSERVICE_LIST_CONFIG_FIELDS_PATTERN =
  'v0.1_list_config_fields';

/**
 * Message pattern used to create a new configuration field on a config
 * object.
 */
export const MICROSERVICE_CREATE_CONFIG_FIELD_PATTERN =
  'v0.1_create_config_field';

/**
 * Message pattern used to update an existing configuration field.
 */
export const MICROSERVICE_UPDATE_CONFIG_FIELD_PATTERN =
  'v0.1_update_config_field';

/**
 * Message pattern used to delete an existing configuration field.
 */
export const MICROSERVICE_DELETE_CONFIG_FIELD_PATTERN =
  'v0.1_delete_config_field';

/**
 * Message patterns used to manage configuration field-rule metadata.
 */
export const MICROSERVICE_LIST_CONFIG_FIELD_RULES_PATTERN =
  'v0.1_list_config_field_rules';
export const MICROSERVICE_CREATE_CONFIG_FIELD_RULE_PATTERN =
  'v0.1_create_config_field_rule';
export const MICROSERVICE_UPDATE_CONFIG_FIELD_RULE_PATTERN =
  'v0.1_update_config_field_rule';
export const MICROSERVICE_DELETE_CONFIG_FIELD_RULE_PATTERN =
  'v0.1_delete_config_field_rule';

/**
 * Message pattern used to resolve a configurable object instance by
 * combining core entity data with dynamic meta fields.
 */
export const MICROSERVICE_RESOLVE_CONFIG_INSTANCE_PATTERN =
  'v0.1_resolve_config_instance';

/**
 * Message pattern used to apply allowlisted SoR + meta patches in one transaction
 * for `sor_bound` objects (Object Runner unified save).
 */
export const MICROSERVICE_APPLY_SOR_BOUND_INSTANCE_PATCH_PATTERN =
  'v0.1_apply_sor_bound_instance_patch';

/**
 * Message patterns for standalone (`config_custom_object_instances`) CRUD.
 */
export const MICROSERVICE_LIST_CUSTOM_OBJECT_INSTANCES_PATTERN =
  'v0.1_list_custom_object_instances';
export const MICROSERVICE_GET_CUSTOM_OBJECT_INSTANCE_PATTERN =
  'v0.1_get_custom_object_instance';
export const MICROSERVICE_CREATE_CUSTOM_OBJECT_INSTANCE_PATTERN =
  'v0.1_create_custom_object_instance';
export const MICROSERVICE_UPDATE_CUSTOM_OBJECT_INSTANCE_PATTERN =
  'v0.1_update_custom_object_instance';
export const MICROSERVICE_DELETE_CUSTOM_OBJECT_INSTANCE_PATTERN =
  'v0.1_delete_custom_object_instance';

/**
 * Message pattern used to fetch lifecycle configuration for a given
 * configurable object type.
 */
export const MICROSERVICE_GET_CONFIG_LIFECYCLES_PATTERN =
  'v0.1_get_config_lifecycles';

/**
 * Message pattern used to fetch relationship metadata between
 * configurable object types.
 */
export const MICROSERVICE_GET_CONFIG_RELATIONSHIPS_PATTERN =
  'v0.1_get_config_relationships';

/**
 * Message pattern used to list field keys on the target (`toObjectType`) of a relationship
 * for Object Designer relation panels (related-field catalog).
 */
export const MICROSERVICE_GET_CONFIG_RELATIONSHIP_RELATED_FIELD_CATALOG_PATTERN =
  'v0.1_get_config_relationship_related_field_catalog';

/**
 * Message patterns used to manage lifecycle states and transitions
 * for configurable objects (admin operations).
 */
export const MICROSERVICE_CREATE_CONFIG_LIFECYCLE_PATTERN =
  'v0.1_create_config_lifecycle';
export const MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_PATTERN =
  'v0.1_update_config_lifecycle';
export const MICROSERVICE_DELETE_CONFIG_LIFECYCLE_PATTERN =
  'v0.1_delete_config_lifecycle';

export const MICROSERVICE_CREATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN =
  'v0.1_create_config_lifecycle_transition';
export const MICROSERVICE_UPDATE_CONFIG_LIFECYCLE_TRANSITION_PATTERN =
  'v0.1_update_config_lifecycle_transition';
export const MICROSERVICE_DELETE_CONFIG_LIFECYCLE_TRANSITION_PATTERN =
  'v0.1_delete_config_lifecycle_transition';

/**
 * Message patterns used to manage relationship metadata between
 * configurable object types (admin operations).
 */
export const MICROSERVICE_CREATE_CONFIG_RELATIONSHIP_PATTERN =
  'v0.1_create_config_relationship';
export const MICROSERVICE_UPDATE_CONFIG_RELATIONSHIP_PATTERN =
  'v0.1_update_config_relationship';
export const MICROSERVICE_DELETE_CONFIG_RELATIONSHIP_PATTERN =
  'v0.1_delete_config_relationship';

/**
 * Message pattern used to fetch configured views for a given
 * configurable object type.
 */
export const MICROSERVICE_GET_CONFIG_VIEWS_PATTERN =
  'v0.1_get_config_views';

/**
 * Message pattern used to resolve related objects for a given
 * configurable object instance using relationship metadata.
 */
export const MICROSERVICE_GET_RELATED_OBJECTS_PATTERN =
  'v0.1_get_related_objects';

/**
 * Message pattern used to retrieve the current lifecycle state and
 * allowed transitions for a specific instance (project, task, etc.).
 */
export const MICROSERVICE_GET_INSTANCE_LIFECYCLE_STATE_PATTERN =
  'v0.1_get_instance_lifecycle_state';

/**
 * Message pattern used to list configuration template sets
 * for a tenant.
 */
export const MICROSERVICE_LIST_TEMPLATE_SETS_PATTERN =
  'v0.1_list_template_sets';

/**
 * Message pattern used to create a new configuration template set.
 */
export const MICROSERVICE_CREATE_TEMPLATE_SET_PATTERN =
  'v0.1_create_template_set';

/**
 * Message pattern used to update an existing configuration template set.
 */
export const MICROSERVICE_UPDATE_TEMPLATE_SET_PATTERN =
  'v0.1_update_template_set';

/**
 * Message pattern used to deactivate (soft-disable) a configuration template set.
 */
export const MICROSERVICE_DEACTIVATE_TEMPLATE_SET_PATTERN =
  'v0.1_deactivate_template_set';

/**
 * Message pattern used to list configured views for an object type,
 * including list, detail, and form views (board layout is under list `config_json`).
 */
export const MICROSERVICE_LIST_CONFIG_VIEWS_PATTERN =
  'v0.1_list_config_views';

/**
 * Message pattern used to create a new view definition.
 */
export const MICROSERVICE_CREATE_CONFIG_VIEW_PATTERN =
  'v0.1_create_config_view';

/**
 * Message pattern used to update an existing view definition.
 */
export const MICROSERVICE_UPDATE_CONFIG_VIEW_PATTERN =
  'v0.1_update_config_view';

/**
 * Message pattern used to delete an existing view definition.
 */
export const MICROSERVICE_DELETE_CONFIG_VIEW_PATTERN =
  'v0.1_delete_config_view';

/**
 * Message patterns for runtime view-config composition:
 * - get/list active view config by entityKey + scope
 * - upsert scoped config record
 * - activate/deactivate by scope
 */
export const MICROSERVICE_GET_ACTIVE_CONFIG_VIEW_PATTERN =
  'v0.1_get_active_config_view';
export const MICROSERVICE_LIST_ACTIVE_CONFIG_VIEWS_PATTERN =
  'v0.1_list_active_config_views';
export const MICROSERVICE_UPSERT_CONFIG_VIEW_SCOPE_PATTERN =
  'v0.1_upsert_config_view_scope';
export const MICROSERVICE_ACTIVATE_CONFIG_VIEW_SCOPE_PATTERN =
  'v0.1_activate_config_view_scope';
export const MICROSERVICE_DEACTIVATE_CONFIG_VIEW_SCOPE_PATTERN =
  'v0.1_deactivate_config_view_scope';

/**
 * Runtime manifest contract:
 * returns resolved list/detail/form payload skeleton for Object Runner.
 */
export const MICROSERVICE_GET_RUNTIME_MANIFEST_PATTERN =
  'v0.1_get_runtime_manifest';

/**
 * Runtime cache invalidation contract:
 * clears in-memory runtime caches (schema/view/manifest) by scope.
 */
export const MICROSERVICE_INVALIDATE_RUNTIME_CACHE_PATTERN =
  'v0.1_invalidate_runtime_cache';

/**
 * Runtime submit-payload composition contract:
 * builds validated root + nested relation payload for create/update.
 */
export const MICROSERVICE_COMPOSE_RUNTIME_SUBMIT_PAYLOAD_PATTERN =
  'v0.1_compose_runtime_submit_payload';

/**
 * Runtime relation-action authorization contract:
 * validates relation/action refs against manifest + caller permissions.
 */
export const MICROSERVICE_VALIDATE_RUNTIME_RELATION_ACTION_PATTERN =
  'v0.1_validate_runtime_relation_action';

/**
 * Message pattern used to list panels for a given view.
 */
export const MICROSERVICE_LIST_CONFIG_VIEW_PANELS_PATTERN =
  'v0.1_list_config_view_panels';

/**
 * Message pattern used to create a new panel within a view.
 */
export const MICROSERVICE_CREATE_CONFIG_VIEW_PANEL_PATTERN =
  'v0.1_create_config_view_panel';

/**
 * Message pattern used to update an existing panel within a view.
 */
export const MICROSERVICE_UPDATE_CONFIG_VIEW_PANEL_PATTERN =
  'v0.1_update_config_view_panel';

/**
 * Message pattern used to delete an existing panel within a view.
 */
export const MICROSERVICE_DELETE_CONFIG_VIEW_PANEL_PATTERN =
  'v0.1_delete_config_view_panel';

/**
 * Message patterns used to manage lifecycle-to-status mappings
 * for configurable object types.
 */
export const MICROSERVICE_LIST_CONFIG_STATUS_MAPPINGS_PATTERN =
  'v0.1_list_config_status_mappings';
export const MICROSERVICE_CREATE_CONFIG_STATUS_MAPPING_PATTERN =
  'v0.1_create_config_status_mapping';
export const MICROSERVICE_UPDATE_CONFIG_STATUS_MAPPING_PATTERN =
  'v0.1_update_config_status_mapping';
export const MICROSERVICE_DELETE_CONFIG_STATUS_MAPPING_PATTERN =
  'v0.1_delete_config_status_mapping';
export const MICROSERVICE_RESOLVE_LIFECYCLE_STATE_FROM_STATUS_PATTERN =
  'v0.1_resolve_lifecycle_state_from_status';
export const MICROSERVICE_RESOLVE_STATUS_FROM_LIFECYCLE_STATE_PATTERN =
  'v0.1_resolve_status_from_lifecycle_state';

/** Designer/API: `config_object_fields` are not allowed for `system_table` objects. */
export const CONFIG_OBJECT_SYSTEM_TABLE_FIELDS_FORBIDDEN_MESSAGE =
  'Custom config fields are not supported when binding_mode is system_table.';

/**
 * Runtime: `resolve_config_instance` with coreId is not the path for `system_table`;
 * use existing REST APIs (Object Runner).
 */
export const CONFIG_OBJECT_SYSTEM_TABLE_RESOLVE_FORBIDDEN_MESSAGE =
  'resolve_config_instance with coreId is not supported for system_table binding_mode; use existing REST APIs.';
