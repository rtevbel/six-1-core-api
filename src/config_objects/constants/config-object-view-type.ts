/**
 * Persisted `config_object_views.view_type` values (Object Designer / runner).
 * `board` is not a view type: board layout lives under `list.config_json.board`.
 */
export const CONFIG_OBJECT_VIEW_TYPES = ['list', 'detail', 'form'] as const;

export type ConfigObjectViewType = (typeof CONFIG_OBJECT_VIEW_TYPES)[number];
