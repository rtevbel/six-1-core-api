/**
 * Optional validation constraints stored on a setting definition.
 */
export interface SystemSettingConstraints {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  allowedValues?: Array<string | number>;
  /** Seconds for duration type when stored as a number. */
  unit?: 'seconds' | 'minutes' | 'hours' | 'days';
  /** Optional JSON Schema for `json` value type. */
  jsonSchema?: Record<string, unknown>;
  [key: string]: unknown;
}
